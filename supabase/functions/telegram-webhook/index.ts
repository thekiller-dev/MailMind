import { createClient } from "npm:@supabase/supabase-js@2";
import { escapeTelegramHtml, sendTelegramMessage } from "../_shared/telegram.ts";

type TelegramUpdate = {
  update_id: number;
  message?: {
    text?: string;
    chat: { id: number; type: string };
    from?: { username?: string; first_name?: string };
  };
};

const env = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function safeEqual(left: string, right: string): boolean {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  let difference = a.length ^ b.length;
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    difference |= (a[index] ?? 0) ^ (b[index] ?? 0);
  }
  return difference === 0;
}

async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function connectionClient() {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function sendHelp(chatId: number) {
  await sendTelegramMessage(
    chatId,
    [
      "<b>MailMind</b>",
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

function resolveCommand(text: string): string {
  const firstWord = text.split(/\s+/, 1)[0]?.toLowerCase().split("@", 1)[0] ?? "";
  if (firstWord.startsWith("/")) {
    const aliases: Record<string, string> = {
      "/aide": "/help",
      "/connexion": "/status",
      "/derniers": "/recents",
      "/resumes": "/recents",
      "/résumés": "/recents",
      "/urgences": "/urgent",
      "/suspects": "/alerts",
      "/deconnecter": "/unlink",
      "/déconnecter": "/unlink",
    };
    return aliases[firstWord] ?? firstWord;
  }

  const normalized = text
    .toLocaleLowerCase("fr-FR")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

  if (/\b(dernier|recents?|resume|mails?|messages?)\b/.test(normalized)) return "/recents";
  if (/\b(urgence|urgent|immediat)\b/.test(normalized)) return "/urgent";
  if (/\b(phishing|suspect|arnaque|fraude|dangereux)\b/.test(normalized)) return "/alerts";
  if (/\b(alerte|alertes|risque|securite)\b/.test(normalized)) return "/alerts";
  if (/\b(aide|help|commande|commandes)\b/.test(normalized)) return "/help";
  if (/^(bonjour|salut|hello|bonsoir)\b/.test(normalized)) return "/welcome";
  return "";
}

async function sendDigest(
  supabase: ReturnType<typeof connectionClient>,
  chatId: number,
  userId: string,
) {
  const { data: emails, error } = await supabase
    .from("emails")
    .select("sender,subject,summary,category,risk_score,received_at")
    .eq("user_id", userId)
    .order("received_at", { ascending: false })
    .limit(10);
  if (error) throw error;
  if (!emails?.length) return sendTelegramMessage(chatId, "Aucun résumé disponible.");

  const lines = emails.map((email) => {
    const risk = Number(email.risk_score ?? 0) >= 0.6 || email.category === "Phishing" ? " ⚠️" : "";
    return `<b>${escapeTelegramHtml(email.subject || "(sans objet)")}</b>${risk}\n${escapeTelegramHtml(email.summary || email.sender || "Sans résumé")}`;
  });
  await sendTelegramMessage(chatId, `<b>Derniers résumés</b>\n\n${lines.join("\n\n")}`);
}

async function sendAlerts(
  supabase: ReturnType<typeof connectionClient>,
  chatId: number,
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
    .filter(
      (email) =>
        mode === "urgent"
          ? email.category === "Urgent"
          : Number(email.risk_score ?? 0) >= 0.6 ||
            email.category === "Phishing" ||
            email.category === "Sécurité" ||
            email.category === "Urgent",
    )
    .slice(0, 10);
  if (!alerts.length) return sendTelegramMessage(chatId, "Aucune alerte récente.");

  const lines = alerts.map(
    (email) =>
      `<b>${escapeTelegramHtml(email.subject || "(sans objet)")}</b>\n${escapeTelegramHtml(email.summary || email.sender || "Sans résumé")}`,
  );
  await sendTelegramMessage(
    chatId,
    `<b>${mode === "urgent" ? "Alertes urgentes" : "Alertes récentes"}</b>\n\n${lines.join("\n\n")}`,
  );
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("method not allowed", { status: 405 });
  const webhookSecret = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");
  if (!webhookSecret) return json({ error: "not_configured" }, 503);
  if (!safeEqual(request.headers.get("x-telegram-bot-api-secret-token") ?? "", webhookSecret)) {
    return json({ error: "unauthorized" }, 401);
  }
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 256_000) return json({ error: "payload_too_large" }, 413);

  try {
    const update = (await request.json()) as TelegramUpdate;
    const message = update.message;
    if (!message?.text || message.chat.type === "channel") return json({ ok: true, ignored: true });

    const chatId = message.chat.id;
    const supabase = connectionClient();
    const text = message.text.trim();
    const [command, argument] = text.split(/\s+/, 2);
    const normalizedCommand = resolveCommand(text) || command.toLowerCase().split("@", 1)[0];
    const updateEventId = `update:${update.update_id}`;
    const { error: eventClaimError } = await supabase.from("telegram_delivery_events").insert({
      event_id: updateEventId,
      chat_id: chatId,
      event_type: "received",
    });
    if (eventClaimError?.code === "23505") return json({ ok: true, duplicate: true });
    if (eventClaimError) throw eventClaimError;

    if (normalizedCommand === "/start" && argument) {
      const tokenHash = await hashToken(argument);
      const { data: existingChat } = await supabase
        .from("telegram_connections")
        .select("user_id")
        .eq("chat_id", chatId)
        .eq("status", "linked")
        .maybeSingle();
      if (existingChat) {
        await sendTelegramMessage(chatId, "Ce chat Telegram est déjà lié à un compte MailMind.");
        return json({ ok: true });
      }

      const { data: pending, error: pendingError } = await supabase
        .from("telegram_connections")
        .select("user_id")
        .eq("status", "pending")
        .eq("link_token_hash", tokenHash)
        .gt("link_token_expires_at", new Date().toISOString())
        .maybeSingle();
      if (pendingError) throw pendingError;
      if (!pending) {
        await sendTelegramMessage(
          chatId,
          "Lien invalide ou expiré. Génère un nouveau lien depuis MailMind.",
        );
        return json({ ok: true });
      }

      const { error: linkError } = await supabase
        .from("telegram_connections")
        .update({
          chat_id: chatId,
          username: message.from?.username ?? null,
          first_name: message.from?.first_name ?? null,
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
      await sendTelegramMessage(
        chatId,
        "Telegram est maintenant lié à ton compte MailMind. Utilise /help pour voir les commandes.",
      );
      return json({ ok: true });
    }

    const { data: connection, error: connectionError } = await supabase
      .from("telegram_connections")
      .select("user_id,command_access")
      .eq("chat_id", chatId)
      .eq("status", "linked")
      .maybeSingle();
    if (connectionError) throw connectionError;
    if (!connection || !connection.command_access) {
      await sendTelegramMessage(
        chatId,
        "Ce chat n’est pas lié à MailMind. Utilise le lien généré dans Paramètres.",
      );
      return json({ ok: true });
    }

    const { count: recentEvents } = await supabase
      .from("telegram_delivery_events")
      .select("event_id", { count: "exact", head: true })
      .eq("chat_id", chatId)
      .gte("created_at", new Date(Date.now() - 60_000).toISOString());
    if ((recentEvents ?? 0) > 30) {
      await sendTelegramMessage(
        chatId,
        "Trop de commandes en peu de temps. Réessaie dans une minute.",
      );
      return json({ ok: true, rateLimited: true });
    }

    await supabase
      .from("telegram_connections")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("user_id", connection.user_id);

    switch (normalizedCommand) {
      case "/help":
        await sendHelp(chatId);
        break;
      case "/welcome":
        await sendTelegramMessage(
          chatId,
          "Bonjour 👋 Je suis MailMind. Demande-moi tes derniers mails, tes alertes ou les urgences détectées.",
        );
        break;
      case "/status":
        await sendTelegramMessage(
          chatId,
          "Connexion Telegram active. Tes notifications MailMind sont opérationnelles.",
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
          .from("telegram_connections")
          .update({
            chat_id: null,
            status: "revoked",
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", connection.user_id);
        await sendTelegramMessage(chatId, "Chat Telegram retiré de MailMind.");
        break;
      default:
        await sendTelegramMessage(chatId, "Commande inconnue. Utilise /help.");
    }

    return json({ ok: true });
  } catch (error) {
    console.error("telegram webhook failed", error);
    return json({ error: "webhook_failed" }, 500);
  }
});
