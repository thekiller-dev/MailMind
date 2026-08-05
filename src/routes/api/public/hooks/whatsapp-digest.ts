import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "node:crypto";
import { runWhatsAppDigests } from "@/lib/whatsapp-digest.server";

function sameSecret(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Digest WhatsApp quotidien (même auth CRON_SECRET que telegram-digest).
 * Sur Hobby, le cron 17:00 UTC de telegram-digest appelle aussi runWhatsAppDigests ;
 * cette route reste disponible pour un appel manuel / plan Pro.
 */
export const Route = createFileRoute("/api/public/hooks/whatsapp-digest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.CRON_SECRET;
        const provided =
          request.headers.get("x-cron-secret") ??
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
          "";
        if (!expected || !sameSecret(provided, expected)) {
          return new Response("unauthorized", { status: 401 });
        }

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const result = await runWhatsAppDigests(supabaseAdmin);
          return Response.json({ ok: true, ...result });
        } catch (error) {
          console.error("whatsapp digest failed", error);
          return Response.json({ ok: false, error: "digest_failed" }, { status: 500 });
        }
      },
    },
  },
});
