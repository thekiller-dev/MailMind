import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CleanupSchema, cleanupCutoffIso } from "./email-cleanup.shared";

export { CleanupSchema, cleanupCutoffIso } from "./email-cleanup.shared";

export const cleanupOldEmails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => CleanupSchema.parse(data ?? { days: 5 }))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const cutoff = cleanupCutoffIso(data.days);

    const { data: rows, error: selectError } = await supabaseAdmin
      .from("emails")
      .select("id")
      .eq("user_id", context.userId)
      .lt("received_at", cutoff);
    if (selectError) throw selectError;

    const ids = (rows ?? []).map((row) => row.id);
    if (ids.length === 0) {
      return { deleted: 0, days: data.days };
    }

    const { error: deleteError } = await supabaseAdmin
      .from("emails")
      .delete()
      .eq("user_id", context.userId)
      .in("id", ids);
    if (deleteError) throw deleteError;

    return { deleted: ids.length, days: data.days };
  });
