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
  if (!config) {
    throw new Error("OpenWA non configuré (OPENWA_BASE_URL / OPENWA_API_KEY / OPENWA_SESSION_ID)");
  }
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
  intent?: string | null;
  risk_score: number | null;
  risk_reason: string | null;
};

function deriveAction(email: EmailNotification): string {
  if (email.intent?.trim()) return email.intent.trim();
  if (email.category === "Urgent") return "Traiter en priorité";
  if (email.category === "Phishing" || email.category === "Sécurité") {
    return "Vérifier avant toute action";
  }
  return "Consulter dans MailMind";
}

function isSecurityAlert(email: EmailNotification): boolean {
  return (
    email.category === "Phishing" ||
    email.category === "Sécurité" ||
    (email.risk_score ?? 0) >= 0.6
  );
}

async function getUserPlan(supabase: SupabaseClient, userId: string): Promise<"free" | "pro"> {
  const { data, error } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data?.plan === "pro" ? "pro" : "free";
}

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
  const action = deriveAction(email);
  const priorityPrefix =
    isUrgent || security ? (isUrgent ? "⚡ Prioritaire — " : "🛡 Sécurité — ") : "";

  if (connection.summary_alerts !== false) {
    await claimAndSend(
      supabase,
      connection.chat_id,
      "recap",
      `email:${email.id}:recap`,
      [
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
        .join("\n"),
    );
  }

  if (isUrgent && connection.urgent_alerts) {
    await claimAndSend(
      supabase,
      connection.chat_id,
      "urgent",
      `email:${email.id}:urgent`,
      [
        "*Alerte urgente*",
        email.subject || "(sans objet)",
        `Expéditeur : ${email.sender || "inconnu"}`,
        email.summary ?? "",
        `Action : ${action}`,
        email.risk_reason ? `Raison : ${email.risk_reason}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  if (security && connection.phishing_alerts) {
    await claimAndSend(
      supabase,
      connection.chat_id,
      "phishing",
      `email:${email.id}:phishing`,
      [
        "*Alerte sécurité*",
        email.subject || "(sans objet)",
        `Expéditeur : ${email.sender || "inconnu"}`,
        email.summary ?? "",
        `Action : ${action}`,
        email.risk_reason ? `Raison : ${email.risk_reason}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }
}
