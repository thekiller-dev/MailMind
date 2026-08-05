import type { SupabaseClient } from "@supabase/supabase-js";

export type UserPlan = "free" | "pro";

export class PlanRestrictionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlanRestrictionError";
  }
}

export function maxEmailAccounts(plan: UserPlan): number {
  return plan === "pro" ? 5 : 1;
}

export async function getUserPlan(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserPlan> {
  const { data, error } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data?.plan === "pro" ? "pro" : "free";
}

export async function assertProMessaging(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserPlan> {
  const plan = await getUserPlan(supabase, userId);
  if (plan !== "pro") {
    throw new PlanRestrictionError(
      "Telegram et WhatsApp sont réservés au plan Pro.",
    );
  }
  return plan;
}

export async function assertCanAddEmailAccount(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ plan: UserPlan; max: number; current: number }> {
  const plan = await getUserPlan(supabase, userId);
  const max = maxEmailAccounts(plan);
  const { count, error } = await supabase
    .from("email_accounts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) throw error;
  const current = count ?? 0;
  if (current >= max) {
    throw new PlanRestrictionError(
      plan === "pro"
        ? "Limite de 5 comptes e-mail atteinte sur le plan Pro."
        : "Le plan Free permet un seul compte e-mail. Passez en Pro pour en ajouter jusqu’à 5.",
    );
  }
  return { plan, max, current };
}

export async function incrementEmailsAnalyzedCount(
  supabase: SupabaseClient,
  userId: string,
  delta = 1,
): Promise<void> {
  if (delta === 0) return;
  const { error } = await supabase.rpc("increment_emails_analyzed_count", {
    p_user_id: userId,
    p_delta: delta,
  });
  if (error) throw error;
}
