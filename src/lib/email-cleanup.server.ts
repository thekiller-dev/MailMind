import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { cleanupCutoffIso } from "./email-cleanup.shared";

type DatabaseClient = SupabaseClient<Database>;

export async function runRetentionCleanup(
  supabase: DatabaseClient,
  options: { settingsLimit?: number; emailsPerUser?: number } = {},
): Promise<{ usersProcessed: number; deletedTotal: number }> {
  const settingsLimit = options.settingsLimit ?? 500;
  const emailsPerUser = options.emailsPerUser ?? 1000;

  const { data: settingsRows, error } = await supabase
    .from("user_settings")
    .select("user_id,settings")
    .limit(settingsLimit);
  if (error) throw error;

  let usersProcessed = 0;
  let deletedTotal = 0;

  for (const row of settingsRows ?? []) {
    const settings = row.settings;
    const daysRaw =
      settings && typeof settings === "object" && !Array.isArray(settings)
        ? (settings as Record<string, unknown>).autoCleanupAfterDays
        : null;
    const days = typeof daysRaw === "number" && daysRaw > 0 ? daysRaw : null;
    if (!days) continue;

    const cutoff = cleanupCutoffIso(days);
    const { data: emails, error: selectError } = await supabase
      .from("emails")
      .select("id")
      .eq("user_id", row.user_id)
      .lt("received_at", cutoff)
      .limit(emailsPerUser);
    if (selectError) throw selectError;

    const ids = (emails ?? []).map((email) => email.id);
    if (ids.length === 0) {
      usersProcessed += 1;
      continue;
    }

    const { error: deleteError } = await supabase
      .from("emails")
      .delete()
      .eq("user_id", row.user_id)
      .in("id", ids);
    if (deleteError) throw deleteError;

    usersProcessed += 1;
    deletedTotal += ids.length;
  }

  return { usersProcessed, deletedTotal };
}
