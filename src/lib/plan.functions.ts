import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { UserPlan } from "./plan.server";

export const getMyPlan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ plan: UserPlan; maxEmailAccounts: number }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getUserPlan, maxEmailAccounts } = await import("./plan.server");
    const plan = await getUserPlan(supabaseAdmin, context.userId);
    return { plan, maxEmailAccounts: maxEmailAccounts(plan) };
  });
