import type { SupabaseClient } from "@supabase/supabase-js";

function escapeTelegramHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendTelegramMessage(chatId: number, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
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
  if (!response.ok) {
    throw new Error(`Telegram notify failed: ${response.status}`);
  }
}

type EmailNotification = {
  id: string;
  sender: string;
  subject: string;
  summary: string | null;
  category: string | null;
  risk_score: number | null;
  risk_reason: string | null;
};

/** Alertes urgentes / phishing après analyse OAuth (parité avec resend-inbound). */
export async function notifyEmailAnalysis(
  supabase: SupabaseClient,
  userId: string,
  email: EmailNotification,
) {
  const { data: connection } = await supabase
    .from("telegram_connections")
    .select("chat_id,urgent_alerts,phishing_alerts,status")
    .eq("user_id", userId)
    .eq("status", "linked")
    .maybeSingle();
  if (!connection?.chat_id) return;

  const isUrgent = email.category === "Urgent";
  const isPhishing =
    email.category === "Phishing" ||
    email.category === "Sécurité" ||
    (email.risk_score ?? 0) >= 0.6;
  const shouldSend =
    (isUrgent && connection.urgent_alerts) || (isPhishing && connection.phishing_alerts);
  if (!shouldSend) return;

  const eventType = isUrgent ? "urgent" : "phishing";
  const eventId = `email:${email.id}:${eventType}`;

  const { error: claimError } = await supabase.from("telegram_delivery_events").insert({
    event_id: eventId,
    chat_id: connection.chat_id,
    event_type: eventType,
  });
  if (claimError) {
    // Unique violation = déjà envoyé (re-sync)
    if (claimError.code === "23505") return;
    throw claimError;
  }

  const text = [
    isUrgent ? "<b>Alerte urgente</b>" : "<b>Alerte sécurité</b>",
    `<b>${escapeTelegramHtml(email.subject || "(sans objet)")}</b>`,
    `Expéditeur : ${escapeTelegramHtml(email.sender || "inconnu")}`,
    email.summary ? escapeTelegramHtml(email.summary) : "",
    email.risk_reason ? `Raison : ${escapeTelegramHtml(email.risk_reason)}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    await sendTelegramMessage(Number(connection.chat_id), text);
  } catch (error) {
    await supabase.from("telegram_delivery_events").delete().eq("event_id", eventId);
    throw error;
  }
}
