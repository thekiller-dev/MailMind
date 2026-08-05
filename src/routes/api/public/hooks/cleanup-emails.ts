import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "node:crypto";
import { cleanupCutoffIso } from "@/lib/email-cleanup.shared";

function timingSafeEqualStr(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

async function handleCleanup(request: Request) {
  const expected = process.env.CRON_SECRET;
  const provided =
    request.headers.get("x-cron-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";
  if (!expected || !provided || !timingSafeEqualStr(provided, expected)) {
    return new Response("unauthorized", { status: 401 });
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: settingsRows, error } = await supabaseAdmin
    .from("user_settings")
    .select("user_id,settings")
    .limit(500);
  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  let usersProcessed = 0;
  let deletedTotal = 0;

  for (const row of settingsRows ?? []) {
    const settings = row.settings;
    const daysRaw =
      settings && typeof settings === "object" && !Array.isArray(settings)
        ? (settings as Record<string, unknown>).autoCleanupAfterDays
        : null;
    const days = typeof daysRaw === "number" && daysRaw > 0 ? daysRaw : null;
    if (!days) continue;

    const cutoff = cleanupCutoffIso(days);
    const { data: emails, error: selectError } = await supabaseAdmin
      .from("emails")
      .select("id")
      .eq("user_id", row.user_id)
      .lt("received_at", cutoff)
      .limit(1000);
    if (selectError) {
      return Response.json({ ok: false, error: selectError.message }, { status: 500 });
    }
    const ids = (emails ?? []).map((email) => email.id);
    if (ids.length === 0) {
      usersProcessed += 1;
      continue;
    }

    const { error: deleteError } = await supabaseAdmin
      .from("emails")
      .delete()
      .eq("user_id", row.user_id)
      .in("id", ids);
    if (deleteError) {
      return Response.json({ ok: false, error: deleteError.message }, { status: 500 });
    }

    usersProcessed += 1;
    deletedTotal += ids.length;
  }

  return Response.json({ deletedTotal, ok: true, usersProcessed });
}

export const Route = createFileRoute("/api/public/hooks/cleanup-emails")({
  server: {
    handlers: {
      GET: ({ request }) => handleCleanup(request),
      POST: ({ request }) => handleCleanup(request),
    },
  },
});
