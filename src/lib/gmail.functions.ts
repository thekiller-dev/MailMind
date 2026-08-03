import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { buildAuthUrl, extractEmailAddress, modifyMessage, sendReply } from "./gmail.server";

function normalizeOrigin(value: string): string {
  const url = new URL(value);
  if (!/^https?:$/.test(url.protocol) || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("Invalid OAuth origin");
  }
  return url.origin;
}

function resolveOrigin(requested: string): string {
  const allowed = (process.env.APP_ORIGINS ?? process.env.APP_ORIGIN ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map(normalizeOrigin);
  if (allowed.length === 0) throw new Error("Missing APP_ORIGIN");

  const normalizedRequested = normalizeOrigin(requested);
  if (!allowed.includes(normalizedRequested)) throw new Error("Invalid OAuth origin");
  return normalizedRequested;
}

function resolveOAuthOrigin(requested: string): string {
  const requestedUrl = new URL(requested);
  if (requestedUrl.hostname === "localhost" || requestedUrl.hostname === "127.0.0.1") {
    return resolveOrigin(requested);
  }
  return resolveOrigin(process.env.APP_ORIGIN ?? "https://www.mailmind.me");
}

export const getGmailAuthUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ origin: z.string().url() }).parse(data))
  .handler(async ({ context, data }) => {
    const origin = resolveOAuthOrigin(data.origin.replace(/\/$/, ""));
    const redirectUri = `${origin}/api/gmail/callback`;
    const { createGmailOAuthState } = await import("./oauth-state.server");
    const { state } = await createGmailOAuthState(context.userId, origin);
    return { url: buildAuthUrl(redirectUri, state), redirectUri };
  });

export const syncMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ accountId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Enforce ownership.
    const { data: acc } = await supabaseAdmin
      .from("email_accounts")
      .select("id,user_id")
      .eq("id", data.accountId)
      .single();
    if (!acc || acc.user_id !== context.userId) throw new Error("Forbidden");
    const { enqueueGmailSync, processGmailSyncQueue } = await import("./gmail-sync-queue.server");
    const queued = await enqueueGmailSync(supabaseAdmin, {
      accountId: data.accountId,
      trigger: "manual",
      userId: context.userId,
    });
    const processed = await processGmailSyncQueue(supabaseAdmin, 1);
    return { processed, queued };
  });

export const disconnectAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ accountId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("email_accounts")
      .delete()
      .eq("id", data.accountId)
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

async function getOwnedMessage(userId: string, emailId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: email } = await supabaseAdmin
    .from("emails")
    .select("id,account_id,provider_message_id,thread_id,sender,subject")
    .eq("id", emailId)
    .eq("user_id", userId)
    .single();
  if (!email?.account_id || !email.provider_message_id || !email.thread_id)
    throw new Error("Email unavailable");
  const providerMessageId = email.provider_message_id;
  const threadId = email.thread_id;

  const { data: account } = await supabaseAdmin
    .from("email_accounts")
    .select("id,user_id,email,provider,access_token,refresh_token,token_expires_at")
    .eq("id", email.account_id)
    .eq("user_id", userId)
    .single();
  if (!account || account.provider !== "google") throw new Error("Unsupported email provider");

  const { ensureFreshToken } = await import("./gmail-sync.server");
  const accessToken = await ensureFreshToken(supabaseAdmin, account);
  return {
    supabaseAdmin,
    email: { ...email, providerMessageId, threadId },
    accessToken,
  };
}

async function auditEmailAction(
  supabase: Awaited<ReturnType<typeof getOwnedMessage>>["supabaseAdmin"],
  input: {
    accountId: string | null;
    action: "archive" | "report" | "reply";
    emailId: string;
    error?: string;
    result: "success" | "failure";
    userId: string;
  },
) {
  try {
    const { recordEmailAction } = await import("./audit.server");
    await recordEmailAction(supabase, input);
  } catch (error) {
    console.error("Unable to record email action", error);
  }
}

export const archiveEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ emailId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin, email, accessToken } = await getOwnedMessage(
      context.userId,
      data.emailId,
    );
    try {
      await modifyMessage(accessToken, email.providerMessageId, "archive");
      const { error } = await supabaseAdmin
        .from("emails")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", email.id)
        .eq("user_id", context.userId);
      if (error) throw error;
      await auditEmailAction(supabaseAdmin, {
        accountId: email.account_id,
        action: "archive",
        emailId: email.id,
        result: "success",
        userId: context.userId,
      });
      return { ok: true };
    } catch (error) {
      await auditEmailAction(supabaseAdmin, {
        accountId: email.account_id,
        action: "archive",
        emailId: email.id,
        error: error instanceof Error ? error.message : String(error),
        result: "failure",
        userId: context.userId,
      });
      throw error;
    }
  });

export const reportEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ emailId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin, email, accessToken } = await getOwnedMessage(
      context.userId,
      data.emailId,
    );
    try {
      await modifyMessage(accessToken, email.providerMessageId, "spam");
      const { error } = await supabaseAdmin
        .from("emails")
        .update({ reported_at: new Date().toISOString(), category: "Phishing" })
        .eq("id", email.id)
        .eq("user_id", context.userId);
      if (error) throw error;
      await auditEmailAction(supabaseAdmin, {
        accountId: email.account_id,
        action: "report",
        emailId: email.id,
        result: "success",
        userId: context.userId,
      });
      return { ok: true };
    } catch (error) {
      await auditEmailAction(supabaseAdmin, {
        accountId: email.account_id,
        action: "report",
        emailId: email.id,
        error: error instanceof Error ? error.message : String(error),
        result: "failure",
        userId: context.userId,
      });
      throw error;
    }
  });

export const sendEmailReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z.object({ emailId: z.string().uuid(), body: z.string().trim().min(1).max(10000) }).parse(data),
  )
  .handler(async ({ context, data }) => {
    const { supabaseAdmin, email, accessToken } = await getOwnedMessage(
      context.userId,
      data.emailId,
    );
    try {
      await sendReply(accessToken, {
        threadId: email.threadId,
        to: extractEmailAddress(email.sender),
        subject: email.subject,
        body: data.body,
      });
      await auditEmailAction(supabaseAdmin, {
        accountId: email.account_id,
        action: "reply",
        emailId: email.id,
        result: "success",
        userId: context.userId,
      });
      return { ok: true };
    } catch (error) {
      await auditEmailAction(supabaseAdmin, {
        accountId: email.account_id,
        action: "reply",
        emailId: email.id,
        error: error instanceof Error ? error.message : String(error),
        result: "failure",
        userId: context.userId,
      });
      throw error;
    }
  });
