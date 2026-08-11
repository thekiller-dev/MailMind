import type { SupabaseClient } from "@supabase/supabase-js";
import { deriveEmailAction, isSecurityAlert, logChannelNotifySkip } from "./channel-notify-shared";
import { getUserPlan } from "./plan.server";

function escapeTelegramHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendTelegramMessage(chatId: number, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    logChannelNotifySkip("telegram", "missing_bot_token");
    return;
  }
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

export type EmailNotification = {
  id: string;
  sender: string;
  subject: string;
  summary: string | null;
  category: string | null;
  intent?: string | null;
  risk_score: number | null;
  risk_reason: string | null;
};

async function claimAndSend(
  supabase: SupabaseClient,
  chatId: number,
  eventType: string,
  eventId: string,
  text: string,
) {
  const { error: claimError } = await supabase.from("telegram_delivery_events").insert({
    event_id: eventId,
    chat_id: chatId,
    event_type: eventType,
  });
  if (claimError) {
    if (claimError.code === "23505") return;
    throw claimError;
  }

  try {
    await sendTelegramMessage(chatId, text);
  } catch (error) {
    await supabase.from("telegram_delivery_events").delete().eq("event_id", eventId);
    throw error;
  }
}

/** Récap + alertes urgentes / phishing après analyse. */
export async function notifyEmailAnalysis(
  supabase: SupabaseClient,
  userId: string,
  email: EmailNotification,
) {
  const plan = await getUserPlan(supabase, userId);
  if (plan !== "pro") {
    logChannelNotifySkip("telegram", "plan_not_pro", { userId, plan, emailId: email.id });
    return;
  }

  const { data: connection } = await supabase
    .from("telegram_connections")
    .select("chat_id,urgent_alerts,phishing_alerts,summary_alerts,status")
    .eq("user_id", userId)
    .eq("status", "linked")
    .maybeSingle();
  if (!connection?.chat_id) {
    logChannelNotifySkip("telegram", "not_linked", { userId, emailId: email.id });
    return;
  }

  const chatId = Number(connection.chat_id);
  const isUrgent = email.category === "Urgent";
  const security = isSecurityAlert(email);
  const action = deriveEmailAction(email);
  const priorityPrefix =
    isUrgent || security ? (isUrgent ? "⚡ Prioritaire — " : "🛡 Sécurité — ") : "";

  if (connection.summary_alerts !== false) {
    const recapText = [
      `<b>${priorityPrefix}Récap MailMind</b>`,
      `<b>${escapeTelegramHtml(email.subject || "(sans objet)")}</b>`,
      `Expéditeur : ${escapeTelegramHtml(email.sender || "inconnu")}`,
      email.category ? `Catégorie : ${escapeTelegramHtml(email.category)}` : "",
      email.summary ? escapeTelegramHtml(email.summary) : "",
      email.risk_score != null && email.risk_score >= 0.4
        ? `Risque : ${Math.round(email.risk_score * 100)}%${
            email.risk_reason ? ` — ${escapeTelegramHtml(email.risk_reason)}` : ""
          }`
        : "",
      `Action : ${escapeTelegramHtml(action)}`,
    ]
      .filter(Boolean)
      .join("\n");

    await claimAndSend(supabase, chatId, "recap", `email:${email.id}:recap`, recapText);
  }

  if (isUrgent && connection.urgent_alerts) {
    const text = [
      "<b>Alerte urgente</b>",
      `<b>${escapeTelegramHtml(email.subject || "(sans objet)")}</b>`,
      `Expéditeur : ${escapeTelegramHtml(email.sender || "inconnu")}`,
      email.summary ? escapeTelegramHtml(email.summary) : "",
      `Action : ${escapeTelegramHtml(action)}`,
      email.risk_reason ? `Raison : ${escapeTelegramHtml(email.risk_reason)}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    await claimAndSend(supabase, chatId, "urgent", `email:${email.id}:urgent`, text);
  }

  if (security && connection.phishing_alerts) {
    const text = [
      "<b>Alerte sécurité</b>",
      `<b>${escapeTelegramHtml(email.subject || "(sans objet)")}</b>`,
      `Expéditeur : ${escapeTelegramHtml(email.sender || "inconnu")}`,
      email.summary ? escapeTelegramHtml(email.summary) : "",
      `Action : ${escapeTelegramHtml(action)}`,
      email.risk_reason ? `Raison : ${escapeTelegramHtml(email.risk_reason)}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    await claimAndSend(supabase, chatId, "phishing", `email:${email.id}:phishing`, text);
  }
}
