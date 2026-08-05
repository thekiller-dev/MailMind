import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "node:crypto";

function sameSecret(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function getLocalDateTime(timeZone: string, date = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return {
      date: `${values.year}-${values.month}-${values.day}`,
      minutes: Number(values.hour) * 60 + Number(values.minute),
    };
  } catch {
    return getLocalDateTime("UTC", date);
  }
}

function isDigestDue(configuredTime: string, timeZone: string, now = new Date()) {
  const [hours, minutes] = configuredTime.split(":").map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  const local = getLocalDateTime(timeZone, now);
  const target = hours * 60 + minutes;
  const difference = Math.abs(local.minutes - target);
  const circularDifference = Math.min(difference, 1_440 - difference);
  if (circularDifference > 14) return null;
  return local.date;
}

async function sendTelegram(chatId: number, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("Missing TELEGRAM_BOT_TOKEN");
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: text.slice(0, 3900),
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });
  if (!response.ok) throw new Error(`Telegram digest failed: ${response.status}`);
}

export const Route = createFileRoute("/api/public/hooks/telegram-digest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.CRON_SECRET;
        const provided =
          request.headers.get("x-cron-secret") ??
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
          "";
        if (!expected || !sameSecret(provided, expected)) {
          return new Response("unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: connections, error: connectionError } = await supabaseAdmin
          .from("telegram_connections")
          .select("user_id,chat_id")
          .eq("status", "linked")
          .eq("summary_digest", true)
          .not("chat_id", "is", null);
        if (connectionError)
          return Response.json({ ok: false, error: "connections_failed" }, { status: 500 });

        const userIds = (connections ?? []).map((connection) => connection.user_id);
        const { data: settingsRows, error: settingsError } = userIds.length
          ? await supabaseAdmin
              .from("user_settings")
              .select("user_id,telegram_digest_time,timezone")
              .in("user_id", userIds)
          : { data: [], error: null };
        if (settingsError)
          return Response.json({ ok: false, error: "settings_failed" }, { status: 500 });

        const settingsByUser = new Map(
          (settingsRows ?? []).map((row) => [
            row.user_id,
            {
              time: row.telegram_digest_time ?? "08:00",
              timezone: row.timezone ?? "UTC",
            },
          ]),
        );
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        let sent = 0;
        const { getUserPlan } = await import("@/lib/plan.server");
        for (const connection of connections ?? []) {
          const plan = await getUserPlan(supabaseAdmin, connection.user_id);
          if (plan !== "pro") continue;
          const settings = settingsByUser.get(connection.user_id) ?? {
            time: "08:00",
            timezone: "UTC",
          };
          const localDate = isDigestDue(settings.time, settings.timezone);
          if (!localDate) continue;
          const digestId = `digest:${localDate}:${connection.user_id}`;
          const { data: alreadySent } = await supabaseAdmin
            .from("telegram_delivery_events")
            .select("event_id")
            .eq("event_id", digestId)
            .maybeSingle();
          if (alreadySent) continue;

          const { data: emails, error: emailError } = await supabaseAdmin
            .from("emails")
            .select("subject,sender,summary,category,risk_score")
            .eq("user_id", connection.user_id)
            .gte("received_at", since)
            .order("received_at", { ascending: false })
            .limit(10);
          if (emailError || !emails?.length) continue;

          const lines = emails.map((email) => {
            const marker =
              Number(email.risk_score ?? 0) >= 0.6 || email.category === "Phishing" ? " ⚠️" : "";
            return `<b>${escapeHtml(email.subject || "(sans objet)")}</b>${marker}\n${escapeHtml(email.summary || email.sender || "Sans résumé")}`;
          });
          await sendTelegram(
            Number(connection.chat_id),
            `<b>Digest MailMind</b>\n\n${lines.join("\n\n")}`,
          );
          await supabaseAdmin.from("telegram_delivery_events").insert({
            event_id: digestId,
            chat_id: connection.chat_id,
            event_type: "digest",
          });
          sent += 1;
        }

        // Hobby : un seul cron 08:00 UTC couvre aussi WhatsApp (OpenWA).
        let whatsappSent = 0;
        try {
          const { runWhatsAppDigests } = await import("@/lib/whatsapp-digest.server");
          const wa = await runWhatsAppDigests(supabaseAdmin);
          whatsappSent = wa.sent;
        } catch (error) {
          console.error("whatsapp digest (via telegram-digest cron) failed", error);
        }

        return Response.json({ ok: true, sent, whatsappSent });
      },
    },
  },
});
