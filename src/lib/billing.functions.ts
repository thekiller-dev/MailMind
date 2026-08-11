import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { UserPlan } from "./plan.server";

export type BillingSnapshot = {
  plan: UserPlan;
  maxEmailAccounts: number;
  stripeConfigured: boolean;
  stripeSubscriptionStatus: string | null;
  canManageBilling: boolean;
};

export const getBillingSnapshot = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BillingSnapshot> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getUserPlan, maxEmailAccounts } = await import("./plan.server");
    const { isStripeConfigured } = await import("./billing.server");
    const plan = await getUserPlan(supabaseAdmin, context.userId);
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id,stripe_subscription_status")
      .eq("id", context.userId)
      .maybeSingle();
    return {
      plan,
      maxEmailAccounts: maxEmailAccounts(plan),
      stripeConfigured: isStripeConfigured(),
      stripeSubscriptionStatus: data?.stripe_subscription_status ?? null,
      canManageBilling: Boolean(data?.stripe_customer_id),
    };
  });

export const startProCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ url: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createProCheckoutSession } = await import("./billing.server");
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    return createProCheckoutSession(supabaseAdmin, {
      userId: context.userId,
      email: userData.user?.email ?? null,
    });
  });

export const openBillingPortal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ url: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createBillingPortalSession } = await import("./billing.server");
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    return createBillingPortalSession(supabaseAdmin, {
      userId: context.userId,
      email: userData.user?.email ?? null,
    });
  });
