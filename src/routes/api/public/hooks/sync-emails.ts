import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "node:crypto";

// Cron endpoint. Syncs every Google account whose last sync is older than 10 minutes.
// Auth: a dedicated CRON_SECRET (NOT the public publishable key, which ships to
// the client and would let anyone trigger syncs). Send it as `x-cron-secret`
// or `Authorization: Bearer <secret>`.
function timingSafeEqualStr(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export const Route = createFileRoute("/api/public/hooks/sync-emails")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.CRON_SECRET;
        const provided =
          request.headers.get("x-cron-secret") ??
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
          "";
        if (!expected || !provided || !timingSafeEqualStr(provided, expected)) {
          return new Response("unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { syncGmailAccount } = await import("@/lib/gmail-sync.server");

        const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();
        const { data: accounts, error } = await supabaseAdmin
          .from("email_accounts")
          .select("id,last_synced_at,provider")
          .eq("provider", "google")
          .eq("status", "connected")
          .or(`last_synced_at.is.null,last_synced_at.lt.${cutoff}`)
          .limit(20);

        if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

        const results: Array<{ id: string; ok: boolean; error?: string }> = [];
        for (const a of accounts ?? []) {
          try {
            await syncGmailAccount(supabaseAdmin, a.id, { analyze: true });
            results.push({ id: a.id, ok: true });
          } catch (e) {
            results.push({
              id: a.id,
              ok: false,
              error: e instanceof Error ? e.message : String(e),
            });
          }
        }

        return Response.json({ ok: true, processed: results.length, results });
      },
    },
  },
});
