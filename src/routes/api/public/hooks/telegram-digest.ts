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

        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const digestId = `digest:${new Date().toISOString().slice(0, 10)}`;
        let sent = 0;
        for (const connection of connections ?? []) {
          const { data: alreadySent } = await supabaseAdmin
            .from("telegram_delivery_events")
            .select("event_id")
            .eq("event_id", `${digestId}:${connection.user_id}`)
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
            event_id: `${digestId}:${connection.user_id}`,
            chat_id: connection.chat_id,
            event_type: "digest",
          });
          sent += 1;
        }

        return Response.json({ ok: true, sent });
      },
    },
  },
});
