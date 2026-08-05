import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface DashboardStats {
  inboxTotal: number;
  analyzedTotal: number;
  urgentTotal: number;
  threatsTotal: number;
  plan: "free" | "pro";
}

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DashboardStats> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("get_dashboard_stats", {
      p_user_id: context.userId,
    });
    if (error) throw error;

    const payload = (data ?? {}) as Record<string, unknown>;
    return {
      inboxTotal: Number(payload.inbox_total ?? 0),
      analyzedTotal: Number(payload.analyzed_total ?? 0),
      urgentTotal: Number(payload.urgent_total ?? 0),
      threatsTotal: Number(payload.threats_total ?? 0),
      plan: payload.plan === "pro" ? "pro" : "free",
    };
  });
