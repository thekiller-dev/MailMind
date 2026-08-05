import { createClient } from "npm:@supabase/supabase-js@2";
import { escapeTelegramHtml, getUserPlan, sendTelegramMessage } from "../_shared/telegram.ts";

type TelegramUpdate = {
  update_id: number;
  message?: {
    text?: string;
    chat: { id: number; type: string };
    from?: { username?: string; first_name?: string };
  };
};

type EmailRow = {
  id: string;
  sender: string | null;
  subject: string | null;
  summary: string | null;
  body: string | null;
  snippet: string | null;
  category: string | null;
  risk_score: number | null;
  risk_reason: string | null;
  engagement?: string | null;
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

function shortEmailRef(emailId: string): string {
  return emailId.replace(/-/g, "").slice(0, 8);
}

function connectionClient() {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function extractArgument(text: string, firstWord: string): string | undefined {
  if (firstWord.startsWith("/")) {
    const rest = text.slice(firstWord.length).trim();
    return rest || undefined;
  }
  const refMatch = text.match(/\b([0-9a-f]{8})\b/i);
  return refMatch?.[1];
}

async function sendHelp(chatId: number) {
  await sendTelegramMessage(
    chatId,
    [
      "<b>MailMind</b>",
      "Tu peux aussi m’écrire naturellement, par exemple :",
      "« Quels sont mes derniers mails ? »",
      "« Ai-je des alertes ? »",
      "« Archive ab12cd34 »",
      "",
      "/status — vérifier la connexion",
      "/recents — derniers mails et résumés",
      "/digest — digest 60 secondes",
      "/alerts — alertes récentes",
      "/urgences — alertes urgentes",
      "/archive &lt;id&gt; — archiver un mail",
      "/draft &lt;id&gt; — brouillon de réponse",
      "/snooze &lt;id&gt; — remettre à plus tard",
      "/share &lt;id&gt; — partager une alerte sécu",
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
      "/archiver": "/archive",
      "/brouillon": "/draft",
      "/repondre": "/draft",
      "/répondre": "/draft",
      "/plus_tard": "/snooze",
      "/partager": "/share",
    };
    return aliases[firstWord] ?? firstWord;
  }

  const normalized = text
    .toLocaleLowerCase("fr-FR")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

  if (/\b(archive|archiver)\b/.test(normalized)) return "/archive";
  if (/\b(brouillon|draft|repond(re|s)?)\b/.test(normalized)) return "/draft";
  if (/\b(snooze|plus.?tard)\b/.test(normalized)) return "/snooze";
  if (/\b(partager|share)\b/.test(normalized)) return "/share";
  if (/\bdigest\b/.test(normalized)) return "/digest";
  if (/\b(dernier|recents?|resume|mails?|messages?)\b/.test(normalized)) return "/recents";
  if (/\b(urgence|urgent|immediat)\b/.test(normalized)) return "/urgent";
  if (/\b(phishing|suspect|arnaque|fraude|dangereux)\b/.test(normalized)) return "/alerts";
  if (/\b(alerte|alertes|risque|securite)\b/.test(normalized)) return "/alerts";
  if (/\b(aide|help|commande|commandes)\b/.test(normalized)) return "/help";
  if (/^(bonjour|salut|hello|bonsoir)\b/.test(normalized)) return "/welcome";
  return "";
}

async function getOwnedEmail(
  supabase: ReturnType<typeof connectionClient>,
  userId: string,
  emailIdOrRef: string,
): Promise<EmailRow> {
  const ref = emailIdOrRef.trim().toLowerCase();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f-]{27}$/i.test(ref)) {
    const { data, error } = await supabase
      .from("emails")
    .select("id,sender,subject,summary,body,snippet,category,risk_score,risk_reason")
    .eq("user_id", userId)
    .eq("id", ref)
    .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Mail introuvable.");
    return data as EmailRow;
  }

  const { data: rows, error } = await supabase
    .from("emails")
    .select("id,sender,subject,summary,body,snippet,category,risk_score,risk_reason")
    .eq("user_id", userId)
    .order("received_at", { ascending: false })
    .limit(40);
  if (error) throw error;
  const match = (rows ?? []).find((row) => shortEmailRef(row.id) === ref.replace(/-/g, ""));
  if (!match) throw new Error("Mail introuvable. Utilise l’id court du récap (/archive ab12cd34).");
  return match as EmailRow;
}

async function draftReplyWithAi(email: EmailRow): Promise<string | null> {
  const apiKey = Deno.env.get("AI_API_KEY");
  if (!apiKey) return null;
  const baseUrl = (Deno.env.get("AI_BASE_URL") ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const authHeader = Deno.env.get("AI_AUTH_HEADER") ?? "Authorization";
  const authPrefix = Deno.env.get("AI_AUTH_PREFIX") ?? "Bearer";
  const model = Deno.env.get("AI_REPLY_MODEL")?.trim() || "gpt-5.6-luna";
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      [authHeader]: `${authPrefix} ${apiKey}`.trim(),
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "Tu es l'assistant de réponse de MailMind. Rédige une réponse professionnelle, concise et en français. Ne fabrique aucun fait, engagement, montant ou date. Retourne uniquement le corps de la réponse.",
        },
        {
          role: "user",
          content: `Expéditeur: ${email.sender ?? ""}\nSujet: ${email.subject ?? ""}\n\nCorps:\n${(email.body ?? email.snippet ?? "").slice(0, 6000)}`,
        },
      ],
    }),
  });
  if (!response.ok) return null;
  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  return typeof content === "string" && content.trim() ? content.trim() : null;
}

async function runChannelAction(
  supabase: ReturnType<typeof connectionClient>,
  userId: string,
  command: string,
  argument: string | undefined,
): Promise<string> {
  if (!argument?.trim()) {
    return `Précise l’id court du mail, ex. ${command} ab12cd34`;
  }
  const email = await getOwnedEmail(supabase, userId, argument.trim().split(/\s+/, 1)[0]!);

  if (command === "/archive") {
    await supabase
      .from("emails")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", email.id)
      .eq("user_id", userId);
    return `Archivé : ${email.subject || "(sans objet)"}`;
  }

  if (command === "/snooze") {
    const until = new Date(Date.now() + 24 * 3_600_000);
    await supabase
      .from("emails")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", email.id)
      .eq("user_id", userId);
    return `Mis de côté jusqu’au ${until.toLocaleString("fr-FR")} — ${email.subject || "(sans objet)"}`;
  }

  if (command === "/share") {
    const riskPct = Math.round((email.risk_score ?? 0) * 100);
    const appOrigin = Deno.env.get("APP_ORIGIN") ?? "https://www.mailmind.me";
    return [
      "⚠️ Alerte sécurité MailMind",
      `Sujet : ${email.subject || "(sans objet)"}`,
      `Expéditeur : ${email.sender || "inconnu"}`,
      email.summary || "",
      `Risque : ${riskPct}%${email.risk_reason ? ` — ${email.risk_reason}` : ""}`,
      "Conseil : ne clique aucun lien et ne partage aucun code.",
      `Détails : ${appOrigin}/inbox`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (command === "/draft") {
    const plan = await getUserPlan(supabase, userId);
    if (plan !== "pro") {
      return "Les brouillons Luna (/draft) sont réservés au plan Pro. Passe en Pro dans MailMind pour en profiter.";
    }
    const draft = await draftReplyWithAi(email);
    if (!draft) {
      return "Brouillon indisponible pour l’instant. Réessaie plus tard ou utilise l’app MailMind.";
    }
    return [
      `Brouillon pour : ${email.subject || "(sans objet)"}`,
      `Réf : ${shortEmailRef(email.id)}`,
      "",
      draft,
      "",
      "Copie ce texte dans Gmail, ou utilise l’app MailMind pour envoyer.",
    ].join("\n");
  }

  return "Action inconnue.";
}

function formatDigest60Html(
  emails: Array<{
    subject: string | null;
    summary: string | null;
    category: string | null;
    risk_score: number | null;
    engagement?: string | null;
  }>,
  analyzedCount: number,
): string {
  const urgent = emails.filter((e) => e.category === "Urgent").length;
  const threats = emails.filter(
    (e) =>
      e.category === "Phishing" ||
      e.category === "Sécurité" ||
      Number(e.risk_score ?? 0) >= 0.6,
  ).length;
  const engagements = emails.filter((e) => e.engagement && e.engagement !== "none").length;
  const minutes = Math.round(Math.max(0, analyzedCount) * 1.2);
  const hours = (minutes / 60).toFixed(1);
  const top = emails.slice(0, 5).map((email, index) => {
    const flag =
      Number(email.risk_score ?? 0) >= 0.6 || email.category === "Phishing"
        ? " ⚠️"
        : email.category === "Urgent"
          ? " ⚡"
          : "";
    const line = `${index + 1}. ${escapeTelegramHtml(email.subject || "(sans objet)")}${flag}`;
    const summary = email.summary
      ? `\n   ${escapeTelegramHtml(email.summary.slice(0, 120))}`
      : "";
    return `${line}${summary}`;
  });
  return [
    "<b>Digest MailMind — 60 secondes</b>",
    `${emails.length} mails · ${urgent} urgents · ${threats} menaces · ${engagements} engagements`,
    `Temps gagné estimé : ~${hours} h (${minutes} min)`,
    "",
    ...top,
    "",
    "Commandes : /archive &lt;id&gt; · /draft &lt;id&gt; · /snooze &lt;id&gt; · /share &lt;id&gt;",
  ].join("\n");
}

async function sendRecents(
  supabase: ReturnType<typeof connectionClient>,
  chatId: number,
  userId: string,
) {
  const { data: emails, error } = await supabase
    .from("emails")
    .select("id,sender,subject,summary,category,risk_score,received_at")
    .eq("user_id", userId)
    .order("received_at", { ascending: false })
    .limit(10);
  if (error) throw error;
  if (!emails?.length) return sendTelegramMessage(chatId, "Aucun résumé disponible.");

  const lines = emails.map((email) => {
    const risk = Number(email.risk_score ?? 0) >= 0.6 || email.category === "Phishing" ? " ⚠️" : "";
    const ref = shortEmailRef(email.id);
    return `<b>${escapeTelegramHtml(email.subject || "(sans objet)")}</b>${risk}\nRéf : <code>${ref}</code>\n${escapeTelegramHtml(email.summary || email.sender || "Sans résumé")}`;
  });
  await sendTelegramMessage(chatId, `<b>Derniers résumés</b>\n\n${lines.join("\n\n")}`);
}

async function sendDigest60(
  supabase: ReturnType<typeof connectionClient>,
  chatId: number,
  userId: string,
) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [{ data: emails, error }, { data: profile }] = await Promise.all([
    supabase
      .from("emails")
      .select("subject,summary,category,risk_score")
      .eq("user_id", userId)
      .gte("received_at", since)
      .order("received_at", { ascending: false })
      .limit(10),
    supabase.from("profiles").select("emails_analyzed_count").eq("id", userId).maybeSingle(),
  ]);
  if (error) throw error;
  if (!emails?.length) return sendTelegramMessage(chatId, "Aucun mail récent pour le digest.");
  await sendTelegramMessage(
    chatId,
    formatDigest60Html(emails, Number(profile?.emails_analyzed_count ?? emails.length)),
  );
}

async function sendAlerts(
  supabase: ReturnType<typeof connectionClient>,
  chatId: number,
  userId: string,
  mode: "all" | "urgent" = "all",
) {
  const { data: emails, error } = await supabase
    .from("emails")
    .select("id,sender,subject,summary,category,risk_score,risk_reason")
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
  if (!alerts.length) return sendTelegramMessage(chatId, "Aucune alerte récente.");

  const lines = alerts.map((email) => {
    const ref = shortEmailRef(email.id);
    return `<b>${escapeTelegramHtml(email.subject || "(sans objet)")}</b>\nRéf : <code>${ref}</code>\n${escapeTelegramHtml(email.summary || email.sender || "Sans résumé")}`;
  });
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
    const firstWord = text.split(/\s+/, 1)[0] ?? "";
    const normalizedCommand = resolveCommand(text) || firstWord.toLowerCase().split("@", 1)[0];
    const argument = extractArgument(text, firstWord);
    const updateEventId = `update:${update.update_id}`;
    const { error: eventClaimError } = await supabase.from("telegram_delivery_events").insert({
      event_id: updateEventId,
      chat_id: chatId,
      event_type: text.startsWith("/") ? "command" : "received",
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
        await sendRecents(supabase, chatId, connection.user_id);
        break;
      case "/digest":
        await sendDigest60(supabase, chatId, connection.user_id);
        break;
      case "/alerts":
        await sendAlerts(supabase, chatId, connection.user_id);
        break;
      case "/urgent":
        await sendAlerts(supabase, chatId, connection.user_id, "urgent");
        break;
      case "/archive":
      case "/draft":
      case "/snooze":
      case "/share": {
        try {
          const result = await runChannelAction(
            supabase,
            connection.user_id,
            normalizedCommand,
            argument,
          );
          await sendTelegramMessage(chatId, escapeTelegramHtml(result));
        } catch (error) {
          await sendTelegramMessage(
            chatId,
            escapeTelegramHtml(error instanceof Error ? error.message : "Action impossible."),
          );
        }
        break;
      }
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
