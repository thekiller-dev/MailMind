import { createFileRoute } from "@tanstack/react-router";
import {
  extractTokenFromRequestBody,
  handleSecurityEvents,
  validateSecurityEventToken,
} from "@/lib/risc.server";

// Google Cross-Account Protection (RISC) receiver.
// Google POSTs cryptographically signed security event tokens (JWTs).
// No shared secret: authenticity comes from Google's JWKS signature + aud/iss checks.
export const Route = createFileRoute("/api/public/hooks/risc")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const raw = await request.text();
          const tokenString = extractTokenFromRequestBody(raw, request.headers.get("content-type"));
          const payload = await validateSecurityEventToken(tokenString);
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const result = await handleSecurityEvents(supabaseAdmin, payload);
          return Response.json(
            { ok: true, duplicate: result.duplicate, events: result.eventTypes },
            { status: 202 },
          );
        } catch (error) {
          console.error("[risc] rejected security event", error);
          return Response.json(
            {
              ok: false,
              error: error instanceof Error ? error.message : "invalid_token",
            },
            { status: 400 },
          );
        }
      },
    },
  },
});
