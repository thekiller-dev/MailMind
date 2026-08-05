import type { SupabaseClient } from "@supabase/supabase-js";
import { deriveEmailAction, isSecurityAlert } from "./channel-notify-shared";
import { sendOpenWaText } from "./openwa.server";
import { getUserPlan } from "./plan.server";
import type { EmailNotification } from "./telegram-notify.server";

async function claimAndSend(
  supabase: SupabaseClient,
  chatId: string,
  eventType: string,
  eventId: string,
  text: string,
) {
  const { error: claimError } = await supabase.from("whatsapp_delivery_events").insert({
    event_id: eventId,
    chat_id: chatId,
    event_type: eventType,
  });
  if (claimError) {
    if (claimError.code === "23505") return;
    throw claimError;
  }

  try {
    await sendOpenWaText(chatId, text);
  } catch (error) {
    await supabase.from("whatsapp_delivery_events").delete().eq("event_id", eventId);
    throw error;
  }
}

/** Récap + alertes urgentes / phishing après analyse (parité Telegram). */
export async function notifyWhatsAppEmailAnalysis(
  supabase: SupabaseClient,
  userId: string,
  email: EmailNotification,
) {
  const plan = await getUserPlan(supabase, userId);
  if (plan !== "pro") return;

  const { data: connection } = await supabase
    .from("whatsapp_connections")
    .select("chat_id,urgent_alerts,phishing_alerts,summary_alerts,status")
    .eq("user_id", userId)
    .eq("status", "linked")
    .maybeSingle();
  if (!connection?.chat_id) return;

  const isUrgent = email.category === "Urgent";
  const security = isSecurityAlert(email);
  const action = deriveEmailAction(email);
  const priorityPrefix =
    isUrgent || security ? (isUrgent ? "⚡ Prioritaire — " : "🛡 Sécurité — ") : "";

  if (connection.summary_alerts !== false) {
    const recapText = [
      `*${priorityPrefix}Récap MailMind*`,
      email.subject || "(sans objet)",
      `Expéditeur : ${email.sender || "inconnu"}`,
      email.category ? `Catégorie : ${email.category}` : "",
      email.summary ?? "",
      email.risk_score != null && email.risk_score >= 0.4
        ? `Risque : ${Math.round(email.risk_score * 100)}%${
            email.risk_reason ? ` — ${email.risk_reason}` : ""
          }`
        : "",
      `Action : ${action}`,
    ]
      .filter(Boolean)
      .join("\n");

    await claimAndSend(
      supabase,
      connection.chat_id,
      "recap",
      `email:${email.id}:recap`,
      recapText,
    );
  }

  if (isUrgent && connection.urgent_alerts) {
    const text = [
      "*Alerte urgente*",
      email.subject || "(sans objet)",
      `Expéditeur : ${email.sender || "inconnu"}`,
      email.summary ?? "",
      `Action : ${action}`,
      email.risk_reason ? `Raison : ${email.risk_reason}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    await claimAndSend(
      supabase,
      connection.chat_id,
      "urgent",
      `email:${email.id}:urgent`,
      text,
    );
  }

  if (security && connection.phishing_alerts) {
    const text = [
      "*Alerte sécurité*",
      email.subject || "(sans objet)",
      `Expéditeur : ${email.sender || "inconnu"}`,
      email.summary ?? "",
      `Action : ${action}`,
      email.risk_reason ? `Raison : ${email.risk_reason}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    await claimAndSend(
      supabase,
      connection.chat_id,
      "phishing",
      `email:${email.id}:phishing`,
      text,
    );
  }
}
