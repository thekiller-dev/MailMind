import type { SupabaseClient } from "@supabase/supabase-js";
import { generateEmailReply } from "./email-analysis.server";
import { getUserPlan } from "./plan.server";
import { formatSecurityShare, shortEmailRef } from "./product-insights";

/**
 * Actions canal (WhatsApp / Telegram) sur un mail précis.
 * Le pendant Telegram vit dans `supabase/functions/telegram-webhook` (Deno)
 * et doit rester aligné sur les messages et le gating Pro ci-dessous.
 */
export type ChannelAction = "/archive" | "/draft" | "/snooze" | "/share";

const EMAIL_FIELDS = "id,sender,subject,summary,body,snippet,category,risk_score,risk_reason";

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
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Résout un mail par UUID complet ou par id court (`shortEmailRef`), toujours scopé à l’utilisateur. */
export async function getOwnedEmail(
  supabase: SupabaseClient,
  userId: string,
  emailIdOrRef: string,
): Promise<EmailRow> {
  const ref = emailIdOrRef.trim().toLowerCase();
  if (UUID_PATTERN.test(ref)) {
    const { data, error } = await supabase
      .from("emails")
      .select(EMAIL_FIELDS)
      .eq("user_id", userId)
      .eq("id", ref)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Mail introuvable.");
    return data as EmailRow;
  }

  const { data: rows, error } = await supabase
    .from("emails")
    .select(EMAIL_FIELDS)
    .eq("user_id", userId)
    .order("received_at", { ascending: false })
    .limit(40);
  if (error) throw error;
  const compact = ref.replace(/-/g, "");
  const match = (rows ?? []).find((row) => shortEmailRef(row.id) === compact);
  if (!match) throw new Error("Mail introuvable. Utilise l’id court du récap (/archive ab12cd34).");
  return match as EmailRow;
}

export async function runChannelAction(
  supabase: SupabaseClient,
  userId: string,
  command: ChannelAction,
  argument: string | undefined,
  options: { appOrigin?: string } = {},
): Promise<string> {
  if (!argument?.trim()) {
    return `Précise l’id court du mail, ex. ${command} ab12cd34`;
  }

  if (command === "/draft" && (await getUserPlan(supabase, userId)) !== "pro") {
    return "Les brouillons IA sont réservés au plan Pro. Passe en Pro depuis l’app MailMind pour les activer.";
  }

  const email = await getOwnedEmail(supabase, userId, argument.trim().split(/\s+/, 1)[0] ?? "");

  switch (command) {
    case "/archive": {
      const { error } = await supabase
        .from("emails")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", email.id)
        .eq("user_id", userId);
      if (error) throw error;
      return `Archivé : ${email.subject || "(sans objet)"}`;
    }

    case "/snooze": {
      const until = new Date(Date.now() + 24 * 3_600_000);
      const { error } = await supabase
        .from("emails")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", email.id)
        .eq("user_id", userId);
      if (error) throw error;
      return `Remis à plus tard jusqu’au ${until.toLocaleString("fr-FR")} — ${email.subject || "(sans objet)"}`;
    }

    case "/share":
      return formatSecurityShare({
        subject: email.subject,
        sender: email.sender,
        summary: email.summary,
        riskScore: email.risk_score,
        riskReason: email.risk_reason,
        appOrigin: options.appOrigin ?? process.env.APP_ORIGIN ?? "https://www.mailmind.me",
      });

    case "/draft": {
      const draft = await generateEmailReply(
        {
          sender: email.sender ?? "inconnu",
          subject: email.subject ?? "(sans objet)",
          body: email.body ?? email.snippet ?? "(corps indisponible)",
        },
        { supabase, userId, emailId: email.id, source: "rpc" },
      );
      if (!draft) return "Brouillon indisponible pour l’instant. Réessaie ou utilise l’app MailMind.";
      return [
        `Brouillon pour : ${email.subject || "(sans objet)"}`,
        `Réf : ${shortEmailRef(email.id)}`,
        "",
        draft,
        "",
        "Copie ce texte dans Gmail, ou utilise l’app MailMind pour envoyer.",
      ].join("\n");
    }
  }
}
