import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "node:crypto";

// Cron endpoint. Syncs every Google account whose last sync is older than 10 minutes.
// Also runs retention cleanup + ops health (Hobby plan allows only 2 Vercel crons).
// Auth: CRON_SECRET via `x-cron-secret` or `Authorization: Bearer <secret>`.
function timingSafeEqualStr(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

async function handleSync(request: Request) {
  const expected = process.env.CRON_SECRET;
  const provided =
    request.headers.get("x-cron-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";
  if (!expected || !provided || !timingSafeEqualStr(provided, expected)) {
    return new Response("unauthorized", { status: 401 });
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { enqueueGmailSync, processGmailSyncQueue } = await import("@/lib/gmail-sync-queue.server");

  const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: accounts, error } = await supabaseAdmin
    .from("email_accounts")
    .select("id,user_id,last_synced_at,provider")
    .eq("provider", "google")
    .eq("status", "connected")
    .or(`last_synced_at.is.null,last_synced_at.lt.${cutoff}`)
    .limit(20);

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  const bucket = Math.floor(Date.now() / (10 * 60 * 1000));
  const enqueued: string[] = [];
  for (const account of accounts ?? []) {
    await enqueueGmailSync(supabaseAdmin, {
      accountId: account.id,
      idempotencyKey: String(bucket),
      trigger: "cron",
      userId: account.user_id,
    });
    enqueued.push(account.id);
  }

  const processed = await processGmailSyncQueue(supabaseAdmin, 10);

  let cleanup: { usersProcessed: number; deletedTotal: number } | { error: string } | null =
    null;
  try {
    const { runRetentionCleanup } = await import("@/lib/email-cleanup.server");
    cleanup = await runRetentionCleanup(supabaseAdmin);
  } catch (cleanupError) {
    cleanup = {
      error: cleanupError instanceof Error ? cleanupError.message : "cleanup_failed",
    };
  }

  let ops:
    | {
        failedLast24h: number;
        stuckPending: number;
        sampleErrors: string[];
        alertSent: boolean;
      }
    | { error: string }
    | null = null;
  try {
    const { getGlobalOpsHealth, maybeSendOpsAlert } = await import("@/lib/sync-ops.server");
    const health = await getGlobalOpsHealth(supabaseAdmin);
    let alertSent = false;
    try {
      alertSent = (await maybeSendOpsAlert(health)).sent;
    } catch (alertError) {
      console.error("[sync-emails] ops alert failed", alertError);
    }
    ops = { ...health, alertSent };
  } catch (opsError) {
    ops = { error: opsError instanceof Error ? opsError.message : "ops_failed" };
  }

  return Response.json({ enqueued, ok: true, processed, cleanup, ops });
}

export const Route = createFileRoute("/api/public/hooks/sync-emails")({
  server: {
    handlers: {
      GET: ({ request }) => handleSync(request),
      POST: ({ request }) => handleSync(request),
    },
  },
});
