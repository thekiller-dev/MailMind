import { createFileRoute } from "@tanstack/react-router";
import { verifyOpenWaSignature } from "@/lib/openwa.server";
import {
  handleOpenWaMessageReceived,
  type OpenWaWebhookBody,
} from "@/lib/whatsapp-webhook.server";

/**
 * Webhook OpenWA → MailMind.
 * Configurer côté OpenWA :
 *   POST /api/sessions/:sessionId/webhooks
 *   { "url": "https://<app>/api/public/hooks/whatsapp",
 *     "events": ["message.received"],
 *     "secret": "<OPENWA_WEBHOOK_SECRET>" }
 * Signature : header X-OpenWA-Signature = sha256=<hmac-hex> sur le corps brut.
 */
export const Route = createFileRoute("/api/public/hooks/whatsapp")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.OPENWA_WEBHOOK_SECRET;
        if (!secret) {
          return Response.json({ error: "not_configured" }, { status: 503 });
        }

        const contentLength = Number(request.headers.get("content-length") ?? 0);
        if (contentLength > 256_000) {
          return Response.json({ error: "payload_too_large" }, { status: 413 });
        }

        const rawBody = await request.text();
        const signature =
          request.headers.get("x-openwa-signature") ?? request.headers.get("X-OpenWA-Signature");
        if (!verifyOpenWaSignature(rawBody, signature, secret)) {
          return Response.json({ error: "unauthorized" }, { status: 401 });
        }

        let payload: OpenWaWebhookBody;
        try {
          payload = JSON.parse(rawBody) as OpenWaWebhookBody;
        } catch {
          return Response.json({ error: "invalid_json" }, { status: 400 });
        }

        const eventName =
          request.headers.get("x-openwa-event") ?? payload.event ?? "";
        if (eventName === "test") {
          return Response.json({ ok: true, test: true });
        }
        if (eventName && eventName !== "message.received") {
          return Response.json({ ok: true, ignored: true, event: eventName });
        }

        const idempotencyKey =
          request.headers.get("x-openwa-idempotency-key") ??
          payload.idempotencyKey ??
          payload.deliveryId ??
          `msg:${payload.data?.id ?? crypto.randomUUID()}`;

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const result = await handleOpenWaMessageReceived(
            supabaseAdmin,
            payload,
            idempotencyKey,
          );
          return Response.json(result);
        } catch (error) {
          console.error("whatsapp webhook failed", error);
          return Response.json({ error: "webhook_failed" }, { status: 500 });
        }
      },
    },
  },
});
