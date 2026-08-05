import type { SupabaseClient } from "@supabase/supabase-js";
import { sendOpenWaText } from "./openwa.server";
import { getUserPlan } from "./plan.server";

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

export function isDigestDue(configuredTime: string, timeZone: string, now = new Date()) {
  const [hours, minutes] = configuredTime.split(":").map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  const local = getLocalDateTime(timeZone, now);
  const target = hours * 60 + minutes;
  const difference = Math.abs(local.minutes - target);
  const circularDifference = Math.min(difference, 1_440 - difference);
  if (circularDifference > 14) return null;
  return local.date;
}

/** Envoie les digests WhatsApp dus (fenêtre ±14 min, 1×/jour). */
export async function runWhatsAppDigests(supabase: SupabaseClient, now = new Date()) {
  const { data: connections, error: connectionError } = await supabase
    .from("whatsapp_connections")
    .select("user_id,chat_id")
    .eq("status", "linked")
    .eq("summary_digest", true)
    .not("chat_id", "is", null);
  if (connectionError) throw connectionError;

  const userIds = (connections ?? []).map((connection) => connection.user_id);
  const { data: settingsRows, error: settingsError } = userIds.length
    ? await supabase
        .from("user_settings")
        .select("user_id,whatsapp_digest_time,timezone")
        .in("user_id", userIds)
    : { data: [], error: null };
  if (settingsError) throw settingsError;

  const settingsByUser = new Map(
    (settingsRows ?? []).map((row) => [
      row.user_id,
      {
        time: (row.whatsapp_digest_time as string | null)?.slice(0, 5) ?? "08:00",
        timezone: row.timezone ?? "UTC",
      },
    ]),
  );

  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  let sent = 0;

  for (const connection of connections ?? []) {
    if (!connection.chat_id) continue;
    const plan = await getUserPlan(supabase, connection.user_id);
    if (plan !== "pro") continue;
    const settings = settingsByUser.get(connection.user_id) ?? {
      time: "08:00",
      timezone: "UTC",
    };
    const localDate = isDigestDue(settings.time, settings.timezone, now);
    if (!localDate) continue;

    const digestId = `digest:${localDate}:${connection.user_id}`;
    const { data: alreadySent } = await supabase
      .from("whatsapp_delivery_events")
      .select("event_id")
      .eq("event_id", digestId)
      .maybeSingle();
    if (alreadySent) continue;

    const { data: emails, error: emailError } = await supabase
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
      return `*${email.subject || "(sans objet)"}${marker}*\n${email.summary || email.sender || "Sans résumé"}`;
    });

    await sendOpenWaText(connection.chat_id, `*Digest MailMind*\n\n${lines.join("\n\n")}`);
    await supabase.from("whatsapp_delivery_events").insert({
      event_id: digestId,
      chat_id: connection.chat_id,
      event_type: "digest",
    });
    sent += 1;
  }

  return { sent };
}
