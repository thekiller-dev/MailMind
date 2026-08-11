import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ChannelNotifyDiagnostics } from "./channel-notify-diagnostics.server";

export const getMyChannelNotifyDiagnostics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ChannelNotifyDiagnostics> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getChannelNotifyDiagnostics } = await import("./channel-notify-diagnostics.server");
    return getChannelNotifyDiagnostics(supabaseAdmin, context.userId);
  });
