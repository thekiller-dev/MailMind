import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export type EmailActionType = "archive" | "report" | "reply";
export type EmailActionResult = "success" | "failure";

export function createActionIdempotencyKey(input: {
  userId: string;
  emailId: string;
  action: EmailActionType;
  requestId?: string;
}): string {
  return createHash("sha256")
    .update(`${input.userId}:${input.emailId}:${input.action}:${input.requestId ?? "once"}`)
    .digest("hex");
}

export async function recordEmailAction(
  supabase: SupabaseClient,
  input: {
    userId: string;
    emailId: string;
    accountId?: string | null;
    action: EmailActionType;
    result: EmailActionResult;
    error?: string;
    requestId?: string;
  },
): Promise<void> {
  const { error } = await supabase.from("email_actions").upsert(
    {
      user_id: input.userId,
      email_id: input.emailId,
      account_id: input.accountId ?? null,
      action: input.action,
      actor: "user",
      result: input.result,
      error: input.error?.slice(0, 1000) ?? null,
      idempotency_key: createActionIdempotencyKey(input),
    },
    { onConflict: "idempotency_key" },
  );
  if (error) throw error;
}

export async function recordUsageEvent(
  supabase: SupabaseClient,
  input: {
    userId: string;
    eventType: "sync" | "telegram_notify" | "export";
    quantity?: number;
    source: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  const { error } = await supabase.from("usage_events").insert({
    user_id: input.userId,
    event_type: input.eventType,
    source: input.source,
    quantity: Math.max(1, Math.trunc(input.quantity ?? 1)),
    metadata: input.metadata ?? {},
  });
  if (error) throw error;
}
