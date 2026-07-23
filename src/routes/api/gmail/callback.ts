import { createFileRoute, redirect } from "@tanstack/react-router";
import { exchangeCode, fetchUserinfo, verifyState } from "@/lib/gmail.server";
import { encryptSecret } from "@/lib/secret-crypto.server";

export const Route = createFileRoute("/api/gmail/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const err = url.searchParams.get("error");
        const origin = `${url.protocol}//${url.host}`;
        const back = (msg: string) =>
          new Response(null, {
            status: 302,
            headers: { Location: `${origin}/settings?gmail=${encodeURIComponent(msg)}` },
          });

        if (err) return back(`error:${err}`);
        if (!code || !state) return back("error:missing_params");
        const verified = verifyState(state);
        if (!verified) return back("error:invalid_state");
        if (verified.origin !== origin) return back("error:invalid_origin");

        try {
          const redirectUri = `${origin}/api/gmail/callback`;
          const tokens = await exchangeCode(code, redirectUri);
          const info = await fetchUserinfo(tokens.access_token);
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

          const accountPayload = {
            user_id: verified.user_id,
            provider: "google",
            provider_account_id: info.sub,
            email: info.email,
            display_name: info.name ?? info.email,
            access_token: encryptSecret(tokens.access_token),
            token_expires_at: tokenExpiresAt,
            scopes: tokens.scope,
            status: "connected",
            error: null,
          } as {
            user_id: string;
            provider: string;
            provider_account_id: string;
            email: string;
            display_name: string;
            access_token: string | null;
            refresh_token?: string | null;
            token_expires_at: string;
            scopes: string;
            status: string;
            error: null;
          };
          if (tokens.refresh_token) {
            accountPayload.refresh_token = encryptSecret(tokens.refresh_token);
          }

          const upsert = await supabaseAdmin
            .from("email_accounts")
            .upsert(accountPayload, { onConflict: "user_id,provider,provider_account_id" })
            .select("id,refresh_token")
            .single();

          if (upsert.error || !upsert.data) return back(`error:db_${upsert.error?.code ?? ""}`);

          // If we didn't receive a refresh token this time (Google may omit it on re-auth),
          // keep any existing one.
          if (!tokens.refresh_token) {
            const { data: keep } = await supabaseAdmin
              .from("email_accounts")
              .select("refresh_token")
              .eq("id", upsert.data.id)
              .single();
            if (!keep?.refresh_token) {
              // no refresh token at all — flag but continue
              await supabaseAdmin
                .from("email_accounts")
                .update({ error: "missing_refresh_token" })
                .eq("id", upsert.data.id);
            }
          }

          // Initial scan. Must be awaited: on serverless the function is frozen
          // once the response is returned, so a fire-and-forget task would be
          // killed mid-sync and the dashboard would stay empty until the cron.
          const accountId = upsert.data.id;
          try {
            const { syncGmailAccount } = await import("@/lib/gmail-sync.server");
            await syncGmailAccount(supabaseAdmin, accountId, {
              maxMessages: 15,
              analyze: true,
            });
          } catch (e) {
            // Non-fatal: the account is connected; the cron will retry the sync.
            console.error("initial sync failed", e);
          }

          return new Response(null, {
            status: 302,
            headers: { Location: `${origin}/dashboard?connected=gmail` },
          });
        } catch (e) {
          console.error("oauth callback error", e);
          return back(`error:${e instanceof Error ? e.message : "unknown"}`);
        }
      },
    },
  },
});
