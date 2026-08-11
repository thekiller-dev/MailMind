import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/kappelas")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { verifyKappelasWebhookRequest, isKappelasConfigured } =
            await import("@/lib/kappelas.server");
          if (!isKappelasConfigured()) {
            return Response.json({ ok: false, error: "not_configured" }, { status: 503 });
          }
          if (!verifyKappelasWebhookRequest(request)) {
            console.warn("[kappelas] webhook unauthorized", {
              hasEnvSecret: Boolean(process.env.KAPPELAS_WEBHOOK_SECRET?.trim()),
              headerNames: [...request.headers.keys()],
              hasQuerySecret: (() => {
                try {
                  const url = new URL(request.url);
                  return url.searchParams.has("secret") || url.searchParams.has("token");
                } catch {
                  return false;
                }
              })(),
            });
            return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
          }

          const raw = await request.text();
          if (raw.length > 512_000) {
            return Response.json({ ok: false, error: "payload_too_large" }, { status: 413 });
          }
          let body: unknown;
          try {
            body = JSON.parse(raw);
          } catch {
            return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
          }

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { processKappelasWebhook } = await import("@/lib/kappelas-webhook.server");
          const result = await processKappelasWebhook(supabaseAdmin, body);
          return Response.json(result);
        } catch (error) {
          console.error("[kappelas] webhook rejected", error);
          return Response.json(
            {
              ok: false,
              error: error instanceof Error ? error.message : "webhook_failed",
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
