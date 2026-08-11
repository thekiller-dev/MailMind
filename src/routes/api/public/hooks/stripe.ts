import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/stripe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
          if (!secret) {
            return Response.json({ ok: false, error: "webhook_not_configured" }, { status: 503 });
          }
          const raw = await request.text();
          if (raw.length > 512_000) {
            return Response.json({ ok: false, error: "payload_too_large" }, { status: 413 });
          }
          const { verifyStripeWebhookSignature, handleStripeWebhookEvent } =
            await import("@/lib/billing.server");
          const verified = verifyStripeWebhookSignature(
            raw,
            request.headers.get("stripe-signature"),
            secret,
          );
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const result = await handleStripeWebhookEvent(supabaseAdmin, verified);
          return Response.json({
            ok: true,
            duplicate: result.duplicate,
            plan: result.plan,
          });
        } catch (error) {
          console.error("[stripe] webhook rejected", error);
          return Response.json(
            {
              ok: false,
              error: error instanceof Error ? error.message : "invalid_webhook",
            },
            { status: 400 },
          );
        }
      },
    },
  },
});
