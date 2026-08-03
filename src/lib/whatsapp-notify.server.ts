import type { SupabaseClient } from "@supabase/supabase-js";
import { sendOpenWaText } from "./openwa.server";

type EmailNotification = {
  id: string;
  sender: string;
  subject: string;
  summary: string | null;
  category: string | null;
  risk_score: number | null;
  risk_reason: string | null;
};

/** Alertes urgentes / phishing après analyse (parité Telegram). */
export async function notifyWhatsAppEmailAnalysis(
  supabase: SupabaseClient,
  userId: string,
  email: EmailNotification,
) {
  const { data: connection } = await supabase
    .from("whatsapp_connections")
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

  const { error: claimError } = await supabase.from("whatsapp_delivery_events").insert({
    event_id: eventId,
    chat_id: connection.chat_id,
    event_type: eventType,
  });
  if (claimError) {
    if (claimError.code === "23505") return;
    throw claimError;
  }

  const text = [
    isUrgent ? "*Alerte urgente*" : "*Alerte sécurité*",
    email.subject || "(sans objet)",
    `Expéditeur : ${email.sender || "inconnu"}`,
    email.summary ?? "",
    email.risk_reason ? `Raison : ${email.risk_reason}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    await sendOpenWaText(connection.chat_id, text);
  } catch (error) {
    await supabase.from("whatsapp_delivery_events").delete().eq("event_id", eventId);
    throw error;
  }
}
