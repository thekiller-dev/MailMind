import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "node:crypto";

function sameSecret(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Cron digests TG + WA (Hobby : 1×/jour).
 * Schedule Vercel : `0 17 * * *` UTC — catch-up si l’heure locale
 * utilisateur (ex. 18:00 Europe/Paris) est déjà passée aujourd’hui.
 * Voir `isDigestDueOrCatchUp` dans digest-schedule.ts.
 */
export const Route = createFileRoute("/api/public/hooks/telegram-digest")({
  server: {
    handlers: {
      GET: ({ request }) => handleDigestCron(request),
      POST: ({ request }) => handleDigestCron(request),
    },
  },
});

async function handleDigestCron(request: Request) {
  const expected = process.env.CRON_SECRET;
  const provided =
    request.headers.get("x-cron-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";
  if (!expected || !sameSecret(provided, expected)) {
    return new Response("unauthorized", { status: 401 });
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { runTelegramDigests, runWhatsAppDigests, runKappelasDigests } =
    await import("@/lib/digest.server");

  let sent = 0;
  let whatsappSent = 0;
  let kappelasSent = 0;
  try {
    const tg = await runTelegramDigests(supabaseAdmin);
    sent = tg.sent;
  } catch (error) {
    console.error("telegram digest failed", error);
    return Response.json({ ok: false, error: "telegram_digest_failed" }, { status: 500 });
  }

  try {
    const wa = await runWhatsAppDigests(supabaseAdmin);
    whatsappSent = wa.sent;
  } catch (error) {
    console.error("whatsapp digest failed", error);
  }

  try {
    const kp = await runKappelasDigests(supabaseAdmin);
    kappelasSent = kp.sent;
  } catch (error) {
    console.error("kappelas digest failed", error);
  }

  return Response.json({ ok: true, sent, whatsappSent, kappelasSent });
}
