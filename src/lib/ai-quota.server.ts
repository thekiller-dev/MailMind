import type { SupabaseClient } from "@supabase/supabase-js";

export type AiUsageEventType = "analysis" | "reply";
export type AiUsageSource = "gmail_sync" | "rpc" | "resend_inbound";

export interface ConsumeAiQuotaInput {
  userId: string;
  eventType: AiUsageEventType;
  source: AiUsageSource;
  emailId?: string;
  inputChars: number;
  model: string;
}

export class AiQuotaExceededError extends Error {
  constructor(public readonly eventType: AiUsageEventType) {
    super(
      eventType === "analysis"
        ? "Quota quotidien d'analyses IA atteint."
        : "Quota quotidien de réponses IA atteint.",
    );
    this.name = "AiQuotaExceededError";
  }
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

async function dailyLimitForUser(
  supabase: SupabaseClient,
  userId: string,
  eventType: AiUsageEventType,
): Promise<number> {
  const freeAnalyze = positiveInteger(process.env.AI_DAILY_ANALYZE_QUOTA, 100);
  const proAnalyze = positiveInteger(process.env.AI_DAILY_ANALYZE_QUOTA_PRO, 2000);
  const freeReply = positiveInteger(process.env.AI_DAILY_REPLY_QUOTA, 20);
  const proReply = positiveInteger(process.env.AI_DAILY_REPLY_QUOTA_PRO, 200);

  const { data } = await supabase.from("profiles").select("plan").eq("id", userId).maybeSingle();
  const isPro = data?.plan === "pro";
  if (eventType === "analysis") return isPro ? proAnalyze : freeAnalyze;
  return isPro ? proReply : freeReply;
}

export async function consumeAiQuota(
  supabase: SupabaseClient,
  input: ConsumeAiQuotaInput,
): Promise<void> {
  const dailyLimit = await dailyLimitForUser(supabase, input.userId, input.eventType);
  const minuteLimit = positiveInteger(process.env.AI_RATE_LIMIT_PER_MINUTE, 10);

  const { data, error } = await supabase.rpc("consume_usage_quota", {
    p_user_id: input.userId,
    p_event_type: input.eventType,
    p_source: input.source,
    p_daily_limit: dailyLimit,
    p_minute_limit: minuteLimit,
    p_quantity: 1,
    p_metadata: {
      email_id: input.emailId ?? null,
      input_chars: Math.max(0, Math.trunc(input.inputChars)),
      model: input.model,
    },
  });

  if (error) throw error;
  if (data !== true) throw new AiQuotaExceededError(input.eventType);
}
