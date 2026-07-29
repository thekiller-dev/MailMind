import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

type TelegramPayload = Record<string, unknown>;

function env(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

export function escapeTelegramHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function telegramApi<T = unknown>(method: string, payload: TelegramPayload) {
  const response = await fetch(
    `https://api.telegram.org/bot${env("TELEGRAM_BOT_TOKEN")}/${method}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  const result = (await response.json().catch(() => null)) as {
    ok?: boolean;
    result?: T;
    description?: string;
  } | null;
  if (!response.ok || !result?.ok) {
    throw new Error(`Telegram API failed: ${response.status} ${result?.description ?? ""}`);
  }
  return result.result as T;
}

export async function sendTelegramMessage(chatId: number, text: string) {
  return telegramApi("sendMessage", {
    chat_id: chatId,
    text: text.slice(0, 3900),
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });
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
  const text = [
    isUrgent ? "<b>Alerte urgente</b>" : "<b>Alerte sécurité</b>",
    `<b>${escapeTelegramHtml(email.subject || "(sans objet)")}</b>`,
    `Expéditeur : ${escapeTelegramHtml(email.sender || "inconnu")}`,
    email.summary ? escapeTelegramHtml(email.summary) : "",
    email.risk_reason ? `Raison : ${escapeTelegramHtml(email.risk_reason)}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  await sendTelegramMessage(Number(connection.chat_id), text);
  await supabase.from("telegram_delivery_events").insert({
    event_id: eventId,
    chat_id: connection.chat_id,
    event_type: eventType,
  });
}
