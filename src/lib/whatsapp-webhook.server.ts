import type { SupabaseClient } from "@supabase/supabase-js";
import { phoneFromChatId, sendOpenWaText } from "./openwa.server";
import {
  extractLinkToken,
  hashLinkToken,
  resolveWhatsAppCommand,
} from "./whatsapp-commands";

type OpenWaMessageData = {
  id?: string;
  from?: string;
  to?: string;
  body?: string | null;
  type?: string;
  isGroup?: boolean;
  kind?: string;
  contact?: { name?: string; pushName?: string } | null;
  fromMe?: boolean;
};

export type OpenWaWebhookBody = {
  event?: string;
  timestamp?: string;
  sessionId?: string;
  idempotencyKey?: string;
  deliveryId?: string;
  data?: OpenWaMessageData;
};

async function sendHelp(chatId: string) {
  await sendOpenWaText(
    chatId,
    [
      "MailMind",
      "Tu peux aussi m’écrire naturellement, par exemple :",
      "« Quels sont mes derniers mails ? »",
      "« Ai-je des alertes ? »",
      "« Y a-t-il une urgence ? »",
      "",
      "/status — vérifier la connexion",
      "/recents — derniers mails et résumés",
      "/alerts — alertes récentes",
      "/urgences — alertes urgentes",
      "/unlink — retirer ce chat de MailMind",
      "/help — afficher cette aide",
    ].join("\n"),
  );
}

async function sendDigest(supabase: SupabaseClient, chatId: string, userId: string) {
  const { data: emails, error } = await supabase
    .from("emails")
    .select("sender,subject,summary,category,risk_score,received_at")
    .eq("user_id", userId)
    .order("received_at", { ascending: false })
    .limit(10);
  if (error) throw error;
  if (!emails?.length) {
    await sendOpenWaText(chatId, "Aucun résumé disponible.");
    return;
  }

  const lines = emails.map((email) => {
    const risk = Number(email.risk_score ?? 0) >= 0.6 || email.category === "Phishing" ? " ⚠️" : "";
    return `*${email.subject || "(sans objet)"}${risk}*\n${email.summary || email.sender || "Sans résumé"}`;
  });
  await sendOpenWaText(chatId, `*Derniers résumés*\n\n${lines.join("\n\n")}`);
}

async function sendAlerts(
  supabase: SupabaseClient,
  chatId: string,
  userId: string,
  mode: "all" | "urgent" = "all",
) {
  const { data: emails, error } = await supabase
    .from("emails")
    .select("sender,subject,summary,category,risk_score,risk_reason")
    .eq("user_id", userId)
    .order("received_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  const alerts = (emails ?? [])
    .filter((email) =>
      mode === "urgent"
        ? email.category === "Urgent"
        : Number(email.risk_score ?? 0) >= 0.6 ||
          email.category === "Phishing" ||
          email.category === "Sécurité" ||
          email.category === "Urgent",
    )
    .slice(0, 10);
  if (!alerts.length) {
    await sendOpenWaText(chatId, "Aucune alerte récente.");
    return;
  }

  const lines = alerts.map(
    (email) =>
      `*${email.subject || "(sans objet)"}*\n${email.summary || email.sender || "Sans résumé"}`,
  );
  await sendOpenWaText(
    chatId,
    `*${mode === "urgent" ? "Alertes urgentes" : "Alertes récentes"}*\n\n${lines.join("\n\n")}`,
  );
}

export async function handleOpenWaMessageReceived(
  supabase: SupabaseClient,
  payload: OpenWaWebhookBody,
  idempotencyKey: string,
): Promise<{ ok: true; duplicate?: boolean; ignored?: boolean; rateLimited?: boolean }> {
  const data = payload.data;
  const body = data?.body?.trim() ?? "";
  const chatId = data?.from?.trim() ?? "";
  if (!body || !chatId) return { ok: true, ignored: true };
  if (data?.fromMe) return { ok: true, ignored: true };
  if (data?.isGroup || data?.kind === "group") return { ok: true, ignored: true };

  const { error: eventClaimError } = await supabase.from("whatsapp_delivery_events").insert({
    event_id: idempotencyKey,
    chat_id: chatId,
    event_type: body.startsWith("/") || /^(lien|start)\s+/i.test(body) ? "command" : "received",
  });
  if (eventClaimError?.code === "23505") return { ok: true, duplicate: true };
  if (eventClaimError) throw eventClaimError;

  const command = resolveWhatsAppCommand(body);
  const linkToken = extractLinkToken(body);

  if (command === "/start" && linkToken) {
    const tokenHash = await hashLinkToken(linkToken);
    const { data: existingChat } = await supabase
      .from("whatsapp_connections")
      .select("user_id")
      .eq("chat_id", chatId)
      .eq("status", "linked")
      .maybeSingle();
    if (existingChat) {
      await sendOpenWaText(chatId, "Ce chat WhatsApp est déjà lié à un compte MailMind.");
      return { ok: true };
    }

    const { data: pending, error: pendingError } = await supabase
      .from("whatsapp_connections")
      .select("user_id")
      .eq("status", "pending")
      .eq("link_token_hash", tokenHash)
      .gt("link_token_expires_at", new Date().toISOString())
      .maybeSingle();
    if (pendingError) throw pendingError;
    if (!pending) {
      await sendOpenWaText(
        chatId,
        "Lien invalide ou expiré. Génère un nouveau lien depuis MailMind → Paramètres.",
      );
      return { ok: true };
    }

    const displayName = data?.contact?.pushName || data?.contact?.name || null;
    const { error: linkError } = await supabase
      .from("whatsapp_connections")
      .update({
        chat_id: chatId,
        phone: phoneFromChatId(chatId),
        display_name: displayName,
        status: "linked",
        link_token_hash: null,
        link_token_expires_at: null,
        linked_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", pending.user_id)
      .eq("status", "pending");
    if (linkError) throw linkError;
    await sendOpenWaText(
      chatId,
      "WhatsApp est maintenant lié à ton compte MailMind. Envoie /help pour voir les commandes.",
    );
    return { ok: true };
  }

  const { data: connection, error: connectionError } = await supabase
    .from("whatsapp_connections")
    .select("user_id,command_access")
    .eq("chat_id", chatId)
    .eq("status", "linked")
    .maybeSingle();
  if (connectionError) throw connectionError;
  if (!connection || !connection.command_access) {
    await sendOpenWaText(
      chatId,
      "Ce chat n’est pas lié à MailMind. Utilise le lien généré dans Paramètres → WhatsApp.",
    );
    return { ok: true };
  }

  const { count: recentEvents } = await supabase
    .from("whatsapp_delivery_events")
    .select("event_id", { count: "exact", head: true })
    .eq("chat_id", chatId)
    .gte("created_at", new Date(Date.now() - 60_000).toISOString());
  if ((recentEvents ?? 0) > 30) {
    await sendOpenWaText(chatId, "Trop de commandes en peu de temps. Réessaie dans une minute.");
    return { ok: true, rateLimited: true };
  }

  await supabase
    .from("whatsapp_connections")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("user_id", connection.user_id);

  switch (command) {
    case "/help":
      await sendHelp(chatId);
      break;
    case "/welcome":
      await sendOpenWaText(
        chatId,
        "Bonjour 👋 Je suis MailMind. Demande-moi tes derniers mails, tes alertes ou les urgences détectées.",
      );
      break;
    case "/status":
      await sendOpenWaText(
        chatId,
        "Connexion WhatsApp active. Tes notifications MailMind sont opérationnelles.",
      );
      break;
    case "/recents":
    case "/digest":
      await sendDigest(supabase, chatId, connection.user_id);
      break;
    case "/alerts":
      await sendAlerts(supabase, chatId, connection.user_id);
      break;
    case "/urgent":
      await sendAlerts(supabase, chatId, connection.user_id, "urgent");
      break;
    case "/unlink":
      await supabase
        .from("whatsapp_connections")
        .update({
          chat_id: null,
          phone: null,
          display_name: null,
          status: "revoked",
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", connection.user_id);
      await sendOpenWaText(chatId, "Chat WhatsApp retiré de MailMind.");
      break;
    default:
      await sendOpenWaText(chatId, "Commande inconnue. Envoie /help.");
  }

  return { ok: true };
}
