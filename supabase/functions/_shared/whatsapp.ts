import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

/**
 * Client OpenWA minimal pour l'edge function resend-inbound (parité Vercel).
 * Env : OPENWA_BASE_URL, OPENWA_API_KEY, OPENWA_SESSION_ID
 */

function envOptional(name: string): string | undefined {
  return Deno.env.get(name)?.trim() || undefined;
}

function getConfig() {
  const baseUrl = envOptional("OPENWA_BASE_URL")?.replace(/\/+$/, "");
  const apiKey = envOptional("OPENWA_API_KEY");
  const sessionId = envOptional("OPENWA_SESSION_ID");
  if (!baseUrl || !apiKey || !sessionId) return null;
  return { baseUrl, apiKey, sessionId };
}

async function sendOpenWaText(chatId: string, text: string) {
  const config = getConfig();
  if (!config) return;
  const response = await fetch(
    `${config.baseUrl}/api/sessions/${encodeURIComponent(config.sessionId)}/messages/send-text`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-API-Key": config.apiKey,
      },
      body: JSON.stringify({ chatId, text: text.slice(0, 4096) }),
    },
  );
  if (!response.ok) {
    throw new Error(`OpenWA send-text failed: ${response.status}`);
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
  if (claimError?.code === "23505") return;
  if (claimError) throw claimError;

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
