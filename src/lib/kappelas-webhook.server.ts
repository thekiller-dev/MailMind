import type { Message } from "@kappelas/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { runChannelAction, type ChannelAction } from "./channel-actions.server";
import { extractKappelasLinkToken, resolveKappelasCommand } from "./kappelas-commands";
import { createKappelasBot, sendKappelasText } from "./kappelas.server";
import { shortEmailRef } from "./product-insights";

async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sendHelp(chatId: number) {
  await sendKappelasText(
    chatId,
    [
      "MailMind sur Kappelas",
      "",
      "/status — vérifier la connexion",
      "/recents — derniers mails",
      "/digest — digest 60 secondes",
      "/alerts — alertes récentes",
      "/urgences — alertes urgentes",
      "/archive <id> — archiver",
      "/draft <id> — brouillon IA (Pro)",
      "/snooze <id> — plus tard",
      "/share <id> — partager une alerte",
      "/unlink — déconnecter",
      "/help — cette aide",
      "",
      "Pour lier : envoyez LIEN <token> ou /start <token>",
    ].join("\n"),
  );
}

async function sendDigest(supabase: SupabaseClient, chatId: number, userId: string) {
  const { data: emails, error } = await supabase
    .from("emails")
    .select("id,sender,subject,summary,category,risk_score,received_at")
    .eq("user_id", userId)
    .order("received_at", { ascending: false })
    .limit(10);
  if (error) throw error;
  if (!emails?.length) {
    await sendKappelasText(chatId, "Aucun résumé disponible.");
    return;
  }
  const lines = emails.map((email) => {
    const risk = Number(email.risk_score ?? 0) >= 0.6 || email.category === "Phishing" ? " ⚠️" : "";
    return `*${email.subject || "(sans objet)"}${risk}*\nRéf : ${shortEmailRef(email.id)}\n${email.summary || email.sender || "Sans résumé"}`;
  });
  await sendKappelasText(chatId, `*Derniers résumés*\n\n${lines.join("\n\n")}`);
}

async function sendAlerts(
  supabase: SupabaseClient,
  chatId: number,
  userId: string,
  mode: "all" | "urgent" = "all",
) {
  const { data: emails, error } = await supabase
    .from("emails")
    .select("id,sender,subject,summary,category,risk_score")
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
    await sendKappelasText(chatId, "Aucune alerte récente.");
    return;
  }
  const lines = alerts.map(
    (email) =>
      `*${email.subject || "(sans objet)"}*\nRéf : ${shortEmailRef(email.id)}\n${email.summary || email.sender || "Sans résumé"}`,
  );
  await sendKappelasText(
    chatId,
    `*${mode === "urgent" ? "Alertes urgentes" : "Alertes récentes"}*\n\n${lines.join("\n\n")}`,
  );
}

async function linkFromToken(
  supabase: SupabaseClient,
  msg: Message,
  token: string,
): Promise<void> {
  const tokenHash = await hashToken(token);
  const { data: pending, error } = await supabase
    .from("kappelas_connections")
    .select("id,user_id,link_token_expires_at")
    .eq("link_token_hash", tokenHash)
    .eq("status", "pending")
    .maybeSingle();
  if (error) throw error;
  if (!pending) {
    await sendKappelasText(msg.chat_id, "Lien invalide ou déjà utilisé. Régénérez-en un depuis MailMind.");
    return;
  }
  if (
    pending.link_token_expires_at &&
    new Date(pending.link_token_expires_at).getTime() < Date.now()
  ) {
    await sendKappelasText(msg.chat_id, "Ce lien a expiré. Régénérez-en un depuis MailMind.");
    return;
  }

  const { error: updateError } = await supabase
    .from("kappelas_connections")
    .update({
      chat_id: msg.chat_id,
      kappelas_user_id: msg.sender_id,
      display_name: msg.sender_name ?? null,
      status: "linked",
      linked_at: new Date().toISOString(),
      link_token_hash: null,
      link_token_expires_at: null,
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", pending.id);
  if (updateError) throw updateError;

  await sendKappelasText(
    msg.chat_id,
    "Kappelas est lié à MailMind. Vous recevrez les récaps et alertes ici. /help pour les commandes.",
  );
}

async function handleLinkedMessage(
  supabase: SupabaseClient,
  msg: Message,
  userId: string,
  commandAccess: boolean,
): Promise<void> {
  const text = (msg.text ?? "").trim();
  if (!text) return;

  await supabase
    .from("kappelas_connections")
    .update({ last_seen_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("chat_id", msg.chat_id);

  const parsed = resolveKappelasCommand(text);
  if (!parsed) {
    await sendKappelasText(msg.chat_id, "Commande inconnue. Envoyez /help.");
    return;
  }

  if (!commandAccess && parsed.command !== "/unlink" && parsed.command !== "/help") {
    await sendKappelasText(msg.chat_id, "Les commandes sont désactivées pour ce compte.");
    return;
  }

  switch (parsed.command) {
    case "/help":
      await sendHelp(msg.chat_id);
      return;
    case "/status":
      await sendKappelasText(msg.chat_id, "Connecté à MailMind. Les alertes Pro sont actives.");
      return;
    case "/digest":
    case "/recents":
      await sendDigest(supabase, msg.chat_id, userId);
      return;
    case "/alerts":
      await sendAlerts(supabase, msg.chat_id, userId, "all");
      return;
    case "/urgences":
      await sendAlerts(supabase, msg.chat_id, userId, "urgent");
      return;
    case "/unlink": {
      await supabase
        .from("kappelas_connections")
        .update({
          chat_id: null,
          kappelas_user_id: null,
          username: null,
          display_name: null,
          status: "revoked",
          linked_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
      await sendKappelasText(msg.chat_id, "Kappelas a été déconnecté de MailMind.");
      return;
    }
    case "/archive":
    case "/draft":
    case "/snooze":
    case "/share": {
      const reply = await runChannelAction(
        supabase,
        userId,
        parsed.command as ChannelAction,
        parsed.argument,
        { appOrigin: process.env.APP_ORIGIN },
      );
      await sendKappelasText(msg.chat_id, reply);
      return;
    }
    default:
      await sendKappelasText(msg.chat_id, "Commande inconnue. Envoyez /help.");
  }
}

async function handleMessage(supabase: SupabaseClient, msg: Message): Promise<void> {
  if (msg.chat_type && msg.chat_type !== "private") return;
  const text = (msg.text ?? "").trim();
  if (!text) return;

  const linkToken = extractKappelasLinkToken(text);
  if (linkToken) {
    await linkFromToken(supabase, msg, linkToken);
    return;
  }

  const { data: connection } = await supabase
    .from("kappelas_connections")
    .select("user_id,command_access,status")
    .eq("chat_id", msg.chat_id)
    .eq("status", "linked")
    .maybeSingle();

  if (!connection) {
    await sendKappelasText(
      msg.chat_id,
      "Ce chat n'est pas lié à MailMind. Ouvrez Paramètres → Notifications → Kappelas pour générer un lien.",
    );
    return;
  }

  await handleLinkedMessage(supabase, msg, connection.user_id, connection.command_access);
}

/**
 * Process a Kappelas webhook body via the official SDK dispatcher.
 * `handleWebhook` is synchronous; we await registered handlers.
 */
export async function processKappelasWebhook(
  supabase: SupabaseClient,
  body: unknown,
): Promise<{ ok: true; handled: number }> {
  const bot = createKappelasBot();
  const tasks: Promise<void>[] = [];

  bot.on("message", (msg) => {
    tasks.push(
      handleMessage(supabase, msg).catch((error) => {
        console.error("[kappelas] message handler failed", error);
      }),
    );
  });

  bot.handleWebhook(body);
  await Promise.all(tasks);
  return { ok: true, handled: tasks.length };
}
