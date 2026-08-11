import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

/**
 * Client Kappelas minimal pour l'edge function resend-inbound (parité Vercel).
 * Env : KAPPELAS_BOT_TOKEN
 */

function envOptional(name: string): string | undefined {
  return Deno.env.get(name)?.trim() || undefined;
}

async function sendKappelasText(chatId: number, text: string) {
  const token = envOptional("KAPPELAS_BOT_TOKEN");
  if (!token) {
    throw new Error("Kappelas non configuré (KAPPELAS_BOT_TOKEN)");
  }
  const response = await fetch(`https://api.kappelas.com/v1/${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: text.slice(0, 3900),
    }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Kappelas sendMessage failed: ${response.status} ${body.slice(0, 200)}`);
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
  chatId: number,
  eventType: string,
  eventId: string,
  text: string,
) {
  const { error: claimError } = await supabase.from("kappelas_delivery_events").insert({
    event_id: eventId,
    chat_id: chatId,
    event_type: eventType,
  });
  if (claimError) {
    if (claimError.code === "23505") return;
    throw claimError;
  }
  try {
    await sendKappelasText(chatId, text);
  } catch (error) {
    await supabase.from("kappelas_delivery_events").delete().eq("event_id", eventId);
    throw error;
  }
}

export async function notifyKappelasEmailAnalysis(
  supabase: SupabaseClient,
  userId: string,
  email: EmailNotification,
) {
  const plan = await getUserPlan(supabase, userId);
  if (plan !== "pro") {
    console.info(
      JSON.stringify({
        tag: "channel-notify",
        channel: "kappelas",
        skip: "plan_not_pro",
        userId,
        plan,
        emailId: email.id,
      }),
    );
    return;
  }

  const { data: connection } = await supabase
    .from("kappelas_connections")
    .select("chat_id,urgent_alerts,phishing_alerts,summary_alerts,status")
    .eq("user_id", userId)
    .eq("status", "linked")
    .maybeSingle();
  if (connection?.chat_id == null) return;

  const chatId = Number(connection.chat_id);
  const isUrgent = email.category === "Urgent";
  const security = isSecurityAlert(email);
  const action = deriveAction(email);
  const priorityPrefix =
    isUrgent || security ? (isUrgent ? "⚡ Prioritaire — " : "🛡 Sécurité — ") : "";

  if (connection.summary_alerts !== false) {
    await claimAndSend(
      supabase,
      chatId,
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
      chatId,
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
      chatId,
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
