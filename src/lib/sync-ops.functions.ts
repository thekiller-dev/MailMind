import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SyncHealthSnapshot } from "./sync-ops.server";

export const getMySyncHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SyncHealthSnapshot> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getUserSyncHealth } = await import("./sync-ops.server");
    return getUserSyncHealth(supabaseAdmin, context.userId);
  });

export const retryMySync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ accountId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { retryUserSync } = await import("./sync-ops.server");
    return retryUserSync(supabaseAdmin, {
      userId: context.userId,
      accountId: data.accountId,
    });
  });
