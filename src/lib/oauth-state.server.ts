import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";

import { supabaseAdmin } from "@/integrations/supabase/client.server";

const STATE_TTL_SECONDS = 10 * 60;

function hashState(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeOrigin(value: string) {
  const url = new URL(value);
  if (!/^https?:$/.test(url.protocol)) throw new Error("Invalid OAuth origin");
  const origin = url.origin;
  if (process.env.NODE_ENV === "production" && !origin.startsWith("https://")) {
    throw new Error("OAuth origin must use HTTPS in production");
  }
  return origin;
}

function oauthStateCookieName() {
  // `__Host-` exige Secure; en local HTTP on utilise un nom classique.
  return process.env.NODE_ENV === "production"
    ? "__Host-mailmind-gmail-state"
    : "mailmind-gmail-state";
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    maxAge,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

export async function createGmailOAuthState(userId: string, requestedOrigin: string) {
  const state = randomBytes(32).toString("base64url");
  const origin = normalizeOrigin(requestedOrigin);
  const { error } = await supabaseAdmin.from("oauth_states").insert({
    expires_at: new Date(Date.now() + STATE_TTL_SECONDS * 1000).toISOString(),
    nonce_hash: hashState(state),
    origin,
    user_id: userId,
  });

  if (error) {
    throw new Error(`Unable to create OAuth state: ${error.message}`);
  }

  setCookie(oauthStateCookieName(), state, cookieOptions(STATE_TTL_SECONDS));
  return { origin, state };
}

export async function consumeGmailOAuthState(
  state: string,
  requestedOrigin: string,
): Promise<string | null> {
  const cookieName = oauthStateCookieName();
  const cookieState = getCookie(cookieName);
  deleteCookie(cookieName, cookieOptions(0));

  if (!cookieState) return null;
  const submitted = Buffer.from(state);
  const expected = Buffer.from(cookieState);
  if (submitted.length !== expected.length || !timingSafeEqual(submitted, expected)) {
    return null;
  }

  const { data, error } = await supabaseAdmin.rpc("consume_oauth_state", {
    p_nonce_hash: hashState(state),
    p_origin: normalizeOrigin(requestedOrigin),
  });

  if (error) {
    throw new Error(`Unable to consume OAuth state: ${error.message}`);
  }
  return data ?? null;
}
