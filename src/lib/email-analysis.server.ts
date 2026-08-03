// Server-only: analyzes an email via a configurable OpenAI-compatible provider.
import { generateText, Output } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createAiProvider } from "./ai-gateway.server";
import { applyAnalysisSettings, getAnalysisInstruction } from "./analysis-settings";
import { minimizeEmailForAi } from "./data-minimization";

export const AnalysisSchema = z.object({
  summary: z.string(),
  category: z.enum([
    "Phishing",
    "Sécurité",
    "Urgent",
    "Finance",
    "Reporting",
    "Commercial",
    "Collaboration",
    "RH",
    "Notification",
    "Autre",
  ]),
  intent: z.string(),
  sentiment: z.enum(["positif", "neutre", "négatif"]),
  risk_score: z.number().min(0).max(1),
  risk_reason: z.string(),
  entities: z.array(z.object({ type: z.string(), value: z.string() })),
});

export type EmailAnalysis = z.infer<typeof AnalysisSchema>;

// Single source of truth for the analysis model. Override via env without a code change.
export const AI_ANALYSIS_MODEL = process.env.AI_ANALYSIS_MODEL ?? "gpt-4o-mini";

export interface AiExecutionContext {
  supabase?: SupabaseClient;
  userId?: string;
  emailId?: string;
  source?: "gmail_sync" | "rpc" | "resend_inbound";
  settings?: unknown;
}

export async function analyzeEmailContent(
  input: {
    sender: string;
    subject: string;
    body: string;
  },
  context: AiExecutionContext = {},
): Promise<EmailAnalysis> {
  const minimized = minimizeEmailForAi(input);
  if (context.supabase && context.userId) {
    const { consumeAiQuota } = await import("./ai-quota.server");
    await consumeAiQuota(context.supabase, {
      userId: context.userId,
      eventType: "analysis",
      source: context.source ?? "rpc",
      emailId: context.emailId,
      inputChars: minimized.body.length,
      model: AI_ANALYSIS_MODEL,
    });
  }
  const gateway = createAiProvider();

  const systemPrompt = `Tu es MailMind, un moteur d'analyse d'e-mails. Tu produis un JSON strict :
- summary (1-2 phrases en français, décisions et actions)
- category (Phishing|Sécurité|Urgent|Finance|Reporting|Commercial|Collaboration|RH|Notification|Autre)
- intent (court : ex "Demande RDV", "Facture", "Réclamation")
- sentiment (positif|neutre|négatif)
- risk_score (0..1) score de phishing/menace
- risk_reason (1 phrase expliquant le score)
- entities (liste {type, value} : dates, montants, contacts, URLs, numéros).`;

  const { output } = await generateText({
    model: gateway(AI_ANALYSIS_MODEL),
    output: Output.object({ schema: AnalysisSchema }),
    system: `${systemPrompt}\n${getAnalysisInstruction(context.settings)}`.trim(),
    prompt: `Expéditeur: ${minimized.sender}\nSujet: ${minimized.subject}\n\nCorps:\n${minimized.body}`,
  });
  return applyAnalysisSettings(output, context.settings);
}

export async function generateEmailReply(
  input: {
    sender: string;
    subject: string;
    body: string;
  },
  context: AiExecutionContext = {},
): Promise<string> {
  const minimized = minimizeEmailForAi(input);
  if (context.supabase && context.userId) {
    const { consumeAiQuota } = await import("./ai-quota.server");
    await consumeAiQuota(context.supabase, {
      userId: context.userId,
      eventType: "reply",
      source: context.source ?? "rpc",
      emailId: context.emailId,
      inputChars: minimized.body.length,
      model: AI_ANALYSIS_MODEL,
    });
  }
  const gateway = createAiProvider();
  const { text } = await generateText({
    model: gateway(AI_ANALYSIS_MODEL),
    system:
      "Tu es l'assistant de réponse de MailMind. Rédige une réponse professionnelle, concise et en français. Ne fabrique aucun fait, engagement, montant ou date. Retourne uniquement le corps de la réponse, sans objet ni salutation ajoutée si elle n'est pas nécessaire.",
    prompt: `Expéditeur: ${minimized.sender}\nSujet: ${minimized.subject}\n\nE-mail reçu:\n${minimized.body}`,
  });
  return text.trim();
}
