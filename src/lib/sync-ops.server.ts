import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { enqueueGmailSync, processGmailSyncQueue } from "./gmail-sync-queue.server";

type DatabaseClient = SupabaseClient<Database>;

export type SyncRunSummary = {
  id: string;
  accountId: string;
  status: string;
  trigger: string;
  error: string | null;
  messagesListed: number;
  messagesInserted: number;
  messagesAnalyzed: number;
  createdAt: string;
  finishedAt: string | null;
};

export type SyncHealthSnapshot = {
  failedLast24h: number;
  partialLast24h: number;
  successLast24h: number;
  stuckPending: number;
  recent: SyncRunSummary[];
};

const STUCK_MINUTES = 30;

export async function getUserSyncHealth(
  supabase: DatabaseClient,
  userId: string,
): Promise<SyncHealthSnapshot> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const stuckBefore = new Date(Date.now() - STUCK_MINUTES * 60 * 1000).toISOString();

  const { data: recentRows, error } = await supabase
    .from("sync_runs")
    .select(
      "id,account_id,status,trigger,error,messages_listed,messages_inserted,messages_analyzed,created_at,finished_at",
    )
    .eq("user_id", userId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(40);
  if (error) throw error;

  const recent: SyncRunSummary[] = (recentRows ?? []).map((row) => ({
    id: row.id,
    accountId: row.account_id,
    status: row.status,
    trigger: row.trigger,
    error: row.error,
    messagesListed: row.messages_listed,
    messagesInserted: row.messages_inserted,
    messagesAnalyzed: row.messages_analyzed,
    createdAt: row.created_at,
    finishedAt: row.finished_at,
  }));

  const { count: stuckPending, error: stuckError } = await supabase
    .from("sync_runs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("status", ["queued", "running"])
    .lt("created_at", stuckBefore);
  if (stuckError) throw stuckError;

  return {
    failedLast24h: recent.filter((r) => r.status === "failed").length,
    partialLast24h: recent.filter((r) => r.status === "partial").length,
    successLast24h: recent.filter((r) => r.status === "success").length,
    stuckPending: stuckPending ?? 0,
    recent,
  };
}

export async function getGlobalOpsHealth(supabase: DatabaseClient): Promise<{
  failedLast24h: number;
  stuckPending: number;
  sampleErrors: string[];
}> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const stuckBefore = new Date(Date.now() - STUCK_MINUTES * 60 * 1000).toISOString();

  const { count: failedLast24h, error } = await supabase
    .from("sync_runs")
    .select("id", { count: "exact", head: true })
    .eq("status", "failed")
    .gte("created_at", since);
  if (error) throw error;

  const { data: failedSamples, error: sampleError } = await supabase
    .from("sync_runs")
    .select("error")
    .eq("status", "failed")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(20);
  if (sampleError) throw sampleError;

  const { count: stuckPending, error: stuckError } = await supabase
    .from("sync_runs")
    .select("id", { count: "exact", head: true })
    .in("status", ["queued", "running"])
    .lt("created_at", stuckBefore);
  if (stuckError) throw stuckError;

  const sampleErrors = [
    ...new Set(
      (failedSamples ?? [])
        .map((row) => row.error)
        .filter((value): value is string => Boolean(value))
        .map((value) => value.slice(0, 160)),
    ),
  ].slice(0, 5);

  return {
    failedLast24h: failedLast24h ?? 0,
    stuckPending: stuckPending ?? 0,
    sampleErrors,
  };
}

export async function retryUserSync(
  supabase: DatabaseClient,
  input: { userId: string; accountId: string },
): Promise<{ queued: boolean; processed: number }> {
  const { data: account, error } = await supabase
    .from("email_accounts")
    .select("id,user_id")
    .eq("id", input.accountId)
    .eq("user_id", input.userId)
    .maybeSingle();
  if (error) throw error;
  if (!account) throw new Error("Forbidden");

  await enqueueGmailSync(supabase, {
    accountId: input.accountId,
    trigger: "manual",
    userId: input.userId,
  });
  const processed = await processGmailSyncQueue(supabase, 1);
  return { queued: true, processed: processed.length };
}

export async function maybeSendOpsAlert(payload: {
  failedLast24h: number;
  stuckPending: number;
  sampleErrors: string[];
}): Promise<{ sent: boolean }> {
  const webhook = process.env.OPS_ALERT_WEBHOOK_URL?.trim();
  const threshold = Number(process.env.OPS_ALERT_FAILED_THRESHOLD ?? "3");
  const failedThreshold = Number.isFinite(threshold) && threshold > 0 ? threshold : 3;
  if (!webhook) return { sent: false };
  if (payload.failedLast24h < failedThreshold && payload.stuckPending === 0) {
    return { sent: false };
  }

  const text = [
    `MailMind ops alert`,
    `failed_24h=${payload.failedLast24h}`,
    `stuck_pending=${payload.stuckPending}`,
    payload.sampleErrors.length
      ? `errors=${payload.sampleErrors.join(" | ")}`
      : "errors=none",
  ].join("\n");

  const response = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, content: text }),
  });
  if (!response.ok) {
    throw new Error(`Ops webhook failed: ${response.status}`);
  }
  return { sent: true };
}
