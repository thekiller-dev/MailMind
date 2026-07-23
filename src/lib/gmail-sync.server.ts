// Server-only: synchronise Gmail account into public.emails and analyse new items.
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchMessage, listMessageIds, refreshAccessToken } from "./gmail.server";
import { analyzeEmailContent } from "./email-analysis.server";
import { decryptSecret, encryptSecret, isEncryptedSecret } from "./secret-crypto.server";
import { buildPreferenceAnalysis, getPreferenceList, matchesSenderList } from "./business-rules";

interface AccountRow {
  id: string;
  user_id: string;
  email: string;
  provider: string;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
}

export async function ensureFreshToken(
  supabase: SupabaseClient,
  account: AccountRow,
): Promise<string> {
  const expiresAt = account.token_expires_at ? new Date(account.token_expires_at).getTime() : 0;
  const accessToken = decryptSecret(account.access_token);
  const refreshToken = decryptSecret(account.refresh_token);
  if (accessToken && expiresAt > Date.now() + 60_000) {
    if (account.access_token && !isEncryptedSecret(account.access_token)) {
      await supabase
        .from("email_accounts")
        .update({ access_token: encryptSecret(accessToken) })
        .eq("id", account.id);
    }
    if (account.refresh_token && !isEncryptedSecret(account.refresh_token)) {
      await supabase
        .from("email_accounts")
        .update({ refresh_token: encryptSecret(refreshToken) })
        .eq("id", account.id);
    }
    return accessToken;
  }
  if (!refreshToken) throw new Error("no refresh token");
  const refreshed = await refreshAccessToken(refreshToken);
  const newExp = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
  await supabase
    .from("email_accounts")
    .update({
      access_token: encryptSecret(refreshed.access_token),
      token_expires_at: newExp,
    })
    .eq("id", account.id);
  return refreshed.access_token;
}

export async function syncGmailAccount(
  supabase: SupabaseClient,
  accountId: string,
  opts: { maxMessages?: number; analyze?: boolean } = {},
) {
  const { data: acc, error: accErr } = await supabase
    .from("email_accounts")
    .select("id,user_id,email,provider,access_token,refresh_token,token_expires_at")
    .eq("id", accountId)
    .single();
  if (accErr || !acc) throw new Error(accErr?.message ?? "account not found");
  if (acc.provider !== "google") throw new Error(`unsupported provider: ${acc.provider}`);

  const account = acc as AccountRow;
  const { data: settingsRow } = await supabase
    .from("user_settings")
    .select("settings")
    .eq("user_id", account.user_id)
    .maybeSingle();
  const settings = settingsRow?.settings;

  try {
    const accessToken = await ensureFreshToken(supabase, account);
    const configuredMax = Number(process.env.GMAIL_SYNC_MAX_MESSAGES ?? 100);
    const maxMessages = Math.min(Math.max(opts.maxMessages ?? configuredMax, 1), 500);
    const ids = await listMessageIds(accessToken, { maxResults: maxMessages });

    let inserted = 0;
    let analyzed = 0;
    const errors: string[] = [];

    for (const id of ids) {
      // dedupe
      const { data: existing } = await supabase
        .from("emails")
        .select("id, analyzed_at")
        .eq("account_id", account.id)
        .eq("provider_message_id", id)
        .maybeSingle();

      let emailRowId = existing?.id as string | undefined;
      const alreadyAnalyzed = !!existing?.analyzed_at;
      let msgSender = "";
      let msgSubject = "";
      let msgBody = "";

      if (!emailRowId) {
        try {
          const m = await fetchMessage(accessToken, id);
          msgSender = m.sender;
          msgSubject = m.subject;
          msgBody = m.body;
          const { data: ins, error: insErr } = await supabase
            .from("emails")
            .insert({
              user_id: account.user_id,
              account_id: account.id,
              provider_message_id: m.id,
              thread_id: m.threadId,
              sender: m.sender,
              subject: m.subject,
              body: m.body,
              snippet: m.snippet,
              received_at: m.receivedAt,
            })
            .select("id")
            .single();
          if (insErr) {
            errors.push(insErr.message);
            continue;
          }
          emailRowId = ins.id;
          inserted++;
        } catch (e) {
          errors.push(e instanceof Error ? e.message : String(e));
          continue;
        }
      } else if (!alreadyAnalyzed) {
        const { data: full } = await supabase
          .from("emails")
          .select("sender,subject,body")
          .eq("id", emailRowId)
          .single();
        msgSender = full?.sender ?? "";
        msgSubject = full?.subject ?? "";
        msgBody = full?.body ?? "";
      }

      if (
        emailRowId &&
        !alreadyAnalyzed &&
        matchesSenderList(msgSender, getPreferenceList(settings, "whitelist"))
      ) {
        const preferenceAnalysis = buildPreferenceAnalysis("whitelist");
        await supabase
          .from("emails")
          .update({ ...preferenceAnalysis, analyzed_at: new Date().toISOString() })
          .eq("id", emailRowId);
        analyzed++;
        continue;
      }

      if (
        emailRowId &&
        !alreadyAnalyzed &&
        matchesSenderList(msgSender, getPreferenceList(settings, "blacklist"))
      ) {
        const preferenceAnalysis = buildPreferenceAnalysis("blacklist");
        await supabase
          .from("emails")
          .update({ ...preferenceAnalysis, analyzed_at: new Date().toISOString() })
          .eq("id", emailRowId);
        analyzed++;
        continue;
      }

      if (opts.analyze !== false && emailRowId && !alreadyAnalyzed) {
        try {
          const a = await analyzeEmailContent({
            sender: msgSender,
            subject: msgSubject,
            body: msgBody,
          });
          await supabase
            .from("emails")
            .update({
              summary: a.summary,
              category: a.category,
              intent: a.intent,
              sentiment: a.sentiment,
              risk_score: a.risk_score,
              risk_reason: a.risk_reason,
              entities: a.entities,
              analyzed_at: new Date().toISOString(),
            })
            .eq("id", emailRowId);
          analyzed++;
        } catch (e) {
          errors.push(e instanceof Error ? e.message : String(e));
        }
      }
    }

    await supabase
      .from("email_accounts")
      .update({
        last_synced_at: new Date().toISOString(),
        status: "connected",
        error: errors.length ? errors.slice(0, 3).join(" | ") : null,
      })
      .eq("id", account.id);

    return { inserted, analyzed, total: ids.length, errors };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabase
      .from("email_accounts")
      .update({ status: "error", error: msg })
      .eq("id", account.id);
    throw e;
  }
}
