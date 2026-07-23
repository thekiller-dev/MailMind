import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  buildAuthUrl,
  extractEmailAddress,
  modifyMessage,
  sendReply,
  signState,
} from "./gmail.server";

function resolveOrigin(requested: string): string {
  const configured = process.env.APP_ORIGIN?.replace(/\/$/, "");
  const request = getRequest();
  const requestOrigin = request ? new URL(request.url).origin : requested;
  const expected = configured ?? requestOrigin;
  if (requested !== expected) throw new Error("Invalid OAuth origin");
  return expected;
}

export const getGmailAuthUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ origin: z.string().url() }).parse(data))
  .handler(async ({ context, data }) => {
    const origin = resolveOrigin(data.origin.replace(/\/$/, ""));
    const redirectUri = `${origin}/api/gmail/callback`;
    const state = signState({
      user_id: context.userId,
      nonce: crypto.randomUUID(),
      exp: Math.floor(Date.now() / 1000) + 600,
      origin,
    });
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
    const { syncGmailAccount } = await import("./gmail-sync.server");
    return await syncGmailAccount(supabaseAdmin, data.accountId, { maxMessages: 15 });
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

export const archiveEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ emailId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin, email, accessToken } = await getOwnedMessage(
      context.userId,
      data.emailId,
    );
    await modifyMessage(accessToken, email.providerMessageId, "archive");
    const { error } = await supabaseAdmin
      .from("emails")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", email.id)
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

export const reportEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ emailId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin, email, accessToken } = await getOwnedMessage(
      context.userId,
      data.emailId,
    );
    await modifyMessage(accessToken, email.providerMessageId, "spam");
    const { error } = await supabaseAdmin
      .from("emails")
      .update({ reported_at: new Date().toISOString(), category: "Phishing" })
      .eq("id", email.id)
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

export const sendEmailReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z.object({ emailId: z.string().uuid(), body: z.string().trim().min(1).max(10000) }).parse(data),
  )
  .handler(async ({ context, data }) => {
    const { email, accessToken } = await getOwnedMessage(context.userId, data.emailId);
    await sendReply(accessToken, {
      threadId: email.threadId,
      to: extractEmailAddress(email.sender),
      subject: email.subject,
      body: data.body,
    });
    return { ok: true };
  });
