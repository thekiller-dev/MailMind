import type { SupabaseClient } from "@supabase/supabase-js";
import {
  digestEventId,
  isDigestDueOrCatchUp,
  normalizeDigestTime,
  startOfLocalDay,
} from "./digest-schedule";
import { getUserPlan } from "./plan.server";
import { formatDigest60Seconds } from "./product-insights";

type DigestChannel = "telegram" | "whatsapp" | "kappelas";

async function loadDigestContext(
  supabase: SupabaseClient,
  channel: DigestChannel,
  now: Date,
) {
  const table =
    channel === "telegram"
      ? "telegram_connections"
      : channel === "whatsapp"
        ? "whatsapp_connections"
        : "kappelas_connections";
  const timeColumn =
    channel === "telegram"
      ? "telegram_digest_time"
      : channel === "whatsapp"
        ? "whatsapp_digest_time"
        : "kappelas_digest_time";

  const { data: connections, error: connectionError } = await supabase
    .from(table)
    .select("user_id,chat_id")
    .eq("status", "linked")
    .eq("summary_digest", true)
    .not("chat_id", "is", null);
  if (connectionError) throw connectionError;

  const userIds = (connections ?? []).map((connection) => connection.user_id);
  const { data: settingsRows, error: settingsError } = userIds.length
    ? await supabase
        .from("user_settings")
        .select(`user_id,${timeColumn},timezone`)
        .in("user_id", userIds)
    : { data: [], error: null };
  if (settingsError) throw settingsError;

  const settingsByUser = new Map(
    (settingsRows ?? []).map((row) => {
      const record = row as Record<string, unknown>;
      return [
        row.user_id,
        {
          time: normalizeDigestTime(String(record[timeColumn] ?? "18:00")),
          timezone: (row.timezone as string | null) ?? "UTC",
        },
      ] as const;
    }),
  );

  const { data: profileRows, error: profileError } = userIds.length
    ? await supabase.from("profiles").select("id,emails_analyzed_count").in("id", userIds)
    : { data: [], error: null };
  if (profileError) throw profileError;
  const analyzedByUser = new Map(
    (profileRows ?? []).map((row) => [row.id, Number(row.emails_analyzed_count ?? 0)]),
  );

  return { connections: connections ?? [], settingsByUser, analyzedByUser, now };
}

async function fetchDayEmails(
  supabase: SupabaseClient,
  userId: string,
  timeZone: string,
  now: Date,
) {
  const since = startOfLocalDay(timeZone, now).toISOString();
  const { data: emails, error } = await supabase
    .from("emails")
    .select("subject,sender,summary,category,risk_score,received_at")
    .eq("user_id", userId)
    .gte("received_at", since)
    .lte("received_at", now.toISOString())
    .order("received_at", { ascending: false })
    .limit(40);
  if (error) throw error;
  return emails ?? [];
}

export async function runTelegramDigests(supabase: SupabaseClient, now = new Date()) {
  const { connections, settingsByUser, analyzedByUser } = await loadDigestContext(
    supabase,
    "telegram",
    now,
  );
  let sent = 0;

  for (const connection of connections) {
    if (connection.chat_id == null) continue;
    const plan = await getUserPlan(supabase, connection.user_id);
    if (plan !== "pro") continue;

    const settings = settingsByUser.get(connection.user_id) ?? {
      time: "18:00",
      timezone: "UTC",
    };
    const localDate = isDigestDueOrCatchUp(settings.time, settings.timezone, now);
    if (!localDate) continue;

    const eventId = digestEventId("telegram", localDate, connection.user_id);
    const { data: alreadySent } = await supabase
      .from("telegram_delivery_events")
      .select("event_id")
      .eq("event_id", eventId)
      .maybeSingle();
    if (alreadySent) continue;

    const emails = await fetchDayEmails(supabase, connection.user_id, settings.timezone, now);
    if (!emails.length) continue;

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) throw new Error("Missing TELEGRAM_BOT_TOKEN");
    const text = formatDigest60Seconds({
      emails,
      analyzedCount: analyzedByUser.get(connection.user_id) ?? emails.length,
      markup: "html",
    });
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: Number(connection.chat_id),
        text: text.slice(0, 3900),
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    if (!response.ok) throw new Error(`Telegram digest failed: ${response.status}`);

    await supabase.from("telegram_delivery_events").insert({
      event_id: eventId,
      chat_id: connection.chat_id,
      event_type: "digest",
    });
    sent += 1;
  }

  return { sent };
}

export async function runWhatsAppDigests(supabase: SupabaseClient, now = new Date()) {
  const { sendOpenWaText } = await import("./openwa.server");
  const { connections, settingsByUser, analyzedByUser } = await loadDigestContext(
    supabase,
    "whatsapp",
    now,
  );
  let sent = 0;

  for (const connection of connections) {
    if (!connection.chat_id) continue;
    const plan = await getUserPlan(supabase, connection.user_id);
    if (plan !== "pro") continue;

    const settings = settingsByUser.get(connection.user_id) ?? {
      time: "18:00",
      timezone: "UTC",
    };
    const localDate = isDigestDueOrCatchUp(settings.time, settings.timezone, now);
    if (!localDate) continue;

    const eventId = digestEventId("whatsapp", localDate, connection.user_id);
    const { data: alreadySent } = await supabase
      .from("whatsapp_delivery_events")
      .select("event_id")
      .eq("event_id", eventId)
      .maybeSingle();
    if (alreadySent) continue;

    const emails = await fetchDayEmails(supabase, connection.user_id, settings.timezone, now);
    if (!emails.length) continue;

    const text = formatDigest60Seconds({
      emails,
      analyzedCount: analyzedByUser.get(connection.user_id) ?? emails.length,
      markup: "md",
    });
    await sendOpenWaText(connection.chat_id, text);
    await supabase.from("whatsapp_delivery_events").insert({
      event_id: eventId,
      chat_id: connection.chat_id,
      event_type: "digest",
    });
    sent += 1;
  }

  return { sent };
}

export async function runKappelasDigests(supabase: SupabaseClient, now = new Date()) {
  const { sendKappelasText } = await import("./kappelas.server");
  const { connections, settingsByUser, analyzedByUser } = await loadDigestContext(
    supabase,
    "kappelas",
    now,
  );
  let sent = 0;

  for (const connection of connections) {
    if (connection.chat_id == null) continue;
    const plan = await getUserPlan(supabase, connection.user_id);
    if (plan !== "pro") continue;

    const settings = settingsByUser.get(connection.user_id) ?? {
      time: "18:00",
      timezone: "UTC",
    };
    const localDate = isDigestDueOrCatchUp(settings.time, settings.timezone, now);
    if (!localDate) continue;

    const eventId = digestEventId("kappelas", localDate, connection.user_id);
    const { data: alreadySent } = await supabase
      .from("kappelas_delivery_events")
      .select("event_id")
      .eq("event_id", eventId)
      .maybeSingle();
    if (alreadySent) continue;

    const emails = await fetchDayEmails(supabase, connection.user_id, settings.timezone, now);
    if (!emails.length) continue;

    const text = formatDigest60Seconds({
      emails,
      analyzedCount: analyzedByUser.get(connection.user_id) ?? emails.length,
      markup: "md",
    });
    await sendKappelasText(Number(connection.chat_id), text);
    await supabase.from("kappelas_delivery_events").insert({
      event_id: eventId,
      chat_id: Number(connection.chat_id),
      event_type: "digest",
    });
    sent += 1;
  }

  return { sent };
}
