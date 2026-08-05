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

export async function notifyEmailAnalysis(
  supabase: SupabaseClient,
  userId: string,
  email: EmailNotification,
) {
  const plan = await getUserPlan(supabase, userId);
  if (plan !== "pro") return;

  const { data: connection } = await supabase
    .from("telegram_connections")
    .select("chat_id,urgent_alerts,phishing_alerts,summary_alerts,status")
    .eq("user_id", userId)
    .eq("status", "linked")
    .maybeSingle();
  if (!connection?.chat_id) return;

  const chatId = Number(connection.chat_id);
  const isUrgent = email.category === "Urgent";
  const security = isSecurityAlert(email);
  const action = deriveAction(email);
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
    await claimAndSend(
      supabase,
      chatId,
      "urgent",
      `email:${email.id}:urgent`,
      [
        "<b>Alerte urgente</b>",
        `<b>${escapeTelegramHtml(email.subject || "(sans objet)")}</b>`,
        `Expéditeur : ${escapeTelegramHtml(email.sender || "inconnu")}`,
        email.summary ? escapeTelegramHtml(email.summary) : "",
        `Action : ${escapeTelegramHtml(action)}`,
        email.risk_reason ? `Raison : ${escapeTelegramHtml(email.risk_reason)}` : "",
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
        "<b>Alerte sécurité</b>",
        `<b>${escapeTelegramHtml(email.subject || "(sans objet)")}</b>`,
        `Expéditeur : ${escapeTelegramHtml(email.sender || "inconnu")}`,
        email.summary ? escapeTelegramHtml(email.summary) : "",
        `Action : ${escapeTelegramHtml(action)}`,
        email.risk_reason ? `Raison : ${escapeTelegramHtml(email.risk_reason)}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }
}
