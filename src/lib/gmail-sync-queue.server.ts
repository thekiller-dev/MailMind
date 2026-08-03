import { createHash, randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "@/integrations/supabase/types";

import { recordUsageEvent } from "./audit.server";
import { syncGmailAccount } from "./gmail-sync.server";

const QUEUE_NAME = "gmail_sync_jobs";
const MAX_ATTEMPTS = 5;

const SyncJobSchema = z.object({
  accountId: z.string().uuid(),
  attempt: z.number().int().min(1).max(MAX_ATTEMPTS),
  runId: z.string().uuid(),
  trigger: z.enum(["cron", "manual", "oauth", "queue", "history"]),
  userId: z.string().uuid(),
});

type DatabaseClient = SupabaseClient<Database>;
type SyncTrigger = z.infer<typeof SyncJobSchema>["trigger"];

function createIdempotencyKey(input: { accountId: string; key?: string; trigger: SyncTrigger }) {
  return createHash("sha256")
    .update(`${input.accountId}:${input.trigger}:${input.key ?? randomUUID()}`)
    .digest("hex");
}

async function sendJob(
  supabase: DatabaseClient,
  job: z.infer<typeof SyncJobSchema>,
  sleepSeconds = 0,
) {
  const { data, error } = await supabase.schema("pgmq_public").rpc("send", {
    message: job,
    queue_name: QUEUE_NAME,
    sleep_seconds: sleepSeconds,
  });
  if (error) throw error;
  return data;
}

export async function enqueueGmailSync(
  supabase: DatabaseClient,
  input: {
    accountId: string;
    idempotencyKey?: string;
    trigger: SyncTrigger;
    userId: string;
  },
) {
  const idempotencyKey = createIdempotencyKey({
    accountId: input.accountId,
    key: input.idempotencyKey,
    trigger: input.trigger,
  });
  const { data: existing } = await supabase
    .from("sync_runs")
    .select("id,status,queue_message_id")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (existing) return existing;

  const { data: run, error } = await supabase
    .from("sync_runs")
    .insert({
      account_id: input.accountId,
      idempotency_key: idempotencyKey,
      trigger: input.trigger,
      user_id: input.userId,
    })
    .select("id,status,queue_message_id")
    .single();
  if (error) {
    if (error.code === "23505") {
      const { data: raced, error: racedError } = await supabase
        .from("sync_runs")
        .select("id,status,queue_message_id")
        .eq("idempotency_key", idempotencyKey)
        .single();
      if (racedError) throw racedError;
      return raced;
    }
    throw error;
  }

  const messageId = await sendJob(supabase, {
    accountId: input.accountId,
    attempt: 1,
    runId: run.id,
    trigger: input.trigger,
    userId: input.userId,
  });
  await supabase.from("sync_runs").update({ queue_message_id: messageId }).eq("id", run.id);
  return { ...run, queue_message_id: messageId };
}

async function archiveMessage(supabase: DatabaseClient, messageId: number) {
  const { error } = await supabase.schema("pgmq_public").rpc("archive", {
    message_id: messageId,
    queue_name: QUEUE_NAME,
  });
  if (error) throw error;
}

export async function processGmailSyncQueue(supabase: DatabaseClient, batchSize = 5) {
  const { data, error } = await supabase.schema("pgmq_public").rpc("read", {
    n: Math.min(Math.max(batchSize, 1), 20),
    queue_name: QUEUE_NAME,
    sleep_seconds: 120,
  });
  if (error) throw error;

  const results: { messageId: number; ok: boolean; runId?: string }[] = [];
  for (const message of data ?? []) {
    const parsed = SyncJobSchema.safeParse(message.message);
    if (!parsed.success) {
      await archiveMessage(supabase, message.msg_id);
      results.push({ messageId: message.msg_id, ok: false });
      continue;
    }

    const job = parsed.data;
    try {
      await supabase
        .from("sync_runs")
        .update({
          error: null,
          started_at: new Date().toISOString(),
          status: "running",
        })
        .eq("id", job.runId);
      const result = await syncGmailAccount(supabase, job.accountId, {
        analyze: true,
      });
      await supabase
        .from("sync_runs")
        .update({
          finished_at: new Date().toISOString(),
          messages_analyzed: result.analyzed,
          messages_inserted: result.inserted,
          messages_listed: result.total,
          status: result.errors.length ? "partial" : "success",
        })
        .eq("id", job.runId);
      await recordUsageEvent(supabase, {
        eventType: "sync",
        metadata: { run_id: job.runId },
        quantity: Math.max(result.total, 1),
        source: job.trigger,
        userId: job.userId,
      });
      await archiveMessage(supabase, message.msg_id);
      results.push({ messageId: message.msg_id, ok: true, runId: job.runId });
    } catch (caught) {
      const failure = caught instanceof Error ? caught.message : String(caught);
      if (job.attempt < MAX_ATTEMPTS) {
        const retryMessageId = await sendJob(
          supabase,
          { ...job, attempt: job.attempt + 1 },
          Math.min(15 * 2 ** job.attempt, 15 * 60),
        );
        await archiveMessage(supabase, message.msg_id);
        await supabase
          .from("sync_runs")
          .update({
            error: failure.slice(0, 1000),
            queue_message_id: retryMessageId,
            status: "queued",
          })
          .eq("id", job.runId);
      } else {
        await archiveMessage(supabase, message.msg_id);
        await supabase
          .from("sync_runs")
          .update({
            error: failure.slice(0, 1000),
            finished_at: new Date().toISOString(),
            status: "failed",
          })
          .eq("id", job.runId);
      }
      results.push({ messageId: message.msg_id, ok: false, runId: job.runId });
    }
  }
  return results;
}
