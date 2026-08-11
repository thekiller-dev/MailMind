import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "node:crypto";

function timingSafeEqualStr(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

async function handleOpsHealth(request: Request) {
  const expected = process.env.CRON_SECRET;
  const provided =
    request.headers.get("x-cron-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";
  if (!expected || !provided || !timingSafeEqualStr(provided, expected)) {
    return new Response("unauthorized", { status: 401 });
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { getGlobalOpsHealth, maybeSendOpsAlert } = await import("@/lib/sync-ops.server");
  const health = await getGlobalOpsHealth(supabaseAdmin);
  let alert: { sent: boolean } = { sent: false };
  try {
    alert = await maybeSendOpsAlert(health);
  } catch (error) {
    console.error("[ops-health] alert webhook failed", error);
  }

  return Response.json({
    ok: true,
    ...health,
    alertSent: alert.sent,
    checkedAt: new Date().toISOString(),
  });
}

export const Route = createFileRoute("/api/public/hooks/ops-health")({
  server: {
    handlers: {
      GET: async ({ request }) => handleOpsHealth(request),
      POST: async ({ request }) => handleOpsHealth(request),
    },
  },
});
