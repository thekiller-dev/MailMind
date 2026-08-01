import { createHash } from "node:crypto";
import { compactVerify, createRemoteJWKSet, decodeJwt, decodeProtectedHeader } from "jose";
import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptSecret } from "./secret-crypto.server";

const RISC_CONFIGURATION_URI = "https://accounts.google.com/.well-known/risc-configuration";

export const RISC_EVENT = {
  SESSIONS_REVOKED: "https://schemas.openid.net/secevent/risc/event-type/sessions-revoked",
  TOKENS_REVOKED: "https://schemas.openid.net/secevent/oauth/event-type/tokens-revoked",
  TOKEN_REVOKED: "https://schemas.openid.net/secevent/oauth/event-type/token-revoked",
  ACCOUNT_DISABLED: "https://schemas.openid.net/secevent/risc/event-type/account-disabled",
  ACCOUNT_ENABLED: "https://schemas.openid.net/secevent/risc/event-type/account-enabled",
  CREDENTIAL_CHANGE_REQUIRED:
    "https://schemas.openid.net/secevent/risc/event-type/account-credential-change-required",
  VERIFICATION: "https://schemas.openid.net/secevent/risc/event-type/verification",
} as const;

type RiscSubject = {
  subject_type?: string;
  iss?: string;
  sub?: string;
  email?: string;
  token_type?: string;
  token_identifier_alg?: string;
  token?: string;
};

type RiscEventPayload = {
  subject?: RiscSubject;
  reason?: string;
  state?: string;
};

export type RiscSecurityEventToken = {
  iss?: string;
  aud?: string | string[];
  iat?: number;
  jti?: string;
  events?: Record<string, RiscEventPayload>;
};

let cachedIssuer: string | null = null;
let cachedJwks: ReturnType<typeof createRemoteJWKSet> | null = null;
let cacheExpiresAt = 0;

async function getRiscVerifier() {
  const now = Date.now();
  if (cachedIssuer && cachedJwks && now < cacheExpiresAt) {
    return { issuer: cachedIssuer, jwks: cachedJwks };
  }

  const response = await fetch(RISC_CONFIGURATION_URI);
  if (!response.ok) {
    throw new Error(`Failed to fetch RISC configuration: ${response.status}`);
  }
  const config = (await response.json()) as { issuer?: string; jwks_uri?: string };
  if (!config.issuer || !config.jwks_uri) {
    throw new Error("Invalid RISC configuration document");
  }

  cachedIssuer = config.issuer;
  cachedJwks = createRemoteJWKSet(new URL(config.jwks_uri));
  cacheExpiresAt = now + 60 * 60 * 1000;
  return { issuer: cachedIssuer, jwks: cachedJwks };
}

export function resolveRiscAudiences(): string[] {
  const audiences = new Set<string>();
  const primary = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  if (primary) audiences.add(primary);
  for (const part of (process.env.GOOGLE_RISC_AUDIENCES ?? "").split(",")) {
    const value = part.trim();
    if (value) audiences.add(value);
  }
  return [...audiences];
}

function audienceMatches(aud: string | string[] | undefined, allowed: string[]): boolean {
  if (!aud) return false;
  const values = Array.isArray(aud) ? aud : [aud];
  return values.some((value) => allowed.includes(value));
}

export async function validateSecurityEventToken(token: string): Promise<RiscSecurityEventToken> {
  const audiences = resolveRiscAudiences();
  if (audiences.length === 0) {
    throw new Error("Missing GOOGLE_OAUTH_CLIENT_ID / GOOGLE_RISC_AUDIENCES");
  }

  // Ensure kid exists before verification (invalid tokens → 400).
  const header = decodeProtectedHeader(token);
  if (!header.kid || header.alg !== "RS256") {
    throw new Error("Invalid JWT header");
  }

  const { issuer, jwks } = await getRiscVerifier();
  // Signature-only verify: security event tokens are historical and must not check exp.
  await compactVerify(token, jwks, { algorithms: ["RS256"] });
  const payload = decodeJwt(token) as RiscSecurityEventToken;

  const tokenIssuer = payload.iss?.replace(/\/$/, "");
  const expectedIssuer = issuer.replace(/\/$/, "");
  if (!tokenIssuer || tokenIssuer !== expectedIssuer) {
    throw new Error("Invalid issuer");
  }
  if (!audienceMatches(payload.aud, audiences)) {
    throw new Error("Invalid audience");
  }
  if (!payload.jti) {
    throw new Error("Missing jti");
  }

  return payload;
}

export function extractTokenFromRequestBody(raw: string, contentType: string | null): string {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("Empty body");

  const isJson =
    contentType?.includes("application/json") || trimmed.startsWith("{") || trimmed.startsWith('"');

  if (isJson) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (typeof parsed === "string") return parsed.trim();
      if (parsed && typeof parsed === "object") {
        const obj = parsed as Record<string, unknown>;
        for (const key of ["token", "secevent", "security_event_token", "jwt"]) {
          if (typeof obj[key] === "string" && obj[key]) return (obj[key] as string).trim();
        }
      }
    } catch {
      // Fall through: treat as raw JWT.
    }
  }

  // Typical delivery: raw JWT (three base64url segments).
  if (trimmed.split(".").length === 3) return trimmed;
  throw new Error("Unrecognized security event token body");
}

function doubleSha512Base64(value: string): string {
  const first = createHash("sha512").update(value, "utf8").digest();
  return createHash("sha512").update(first).digest("base64");
}

async function findGoogleAccountsBySub(
  supabase: SupabaseClient,
  sub: string | undefined,
): Promise<Array<{ id: string; user_id: string; refresh_token: string | null }>> {
  if (!sub) return [];
  const { data, error } = await supabase
    .from("email_accounts")
    .select("id,user_id,refresh_token")
    .eq("provider", "google")
    .eq("provider_account_id", sub);
  if (error) throw error;
  return data ?? [];
}

async function disconnectAccounts(supabase: SupabaseClient, accountIds: string[], reason: string) {
  if (accountIds.length === 0) return;
  const { error } = await supabase
    .from("email_accounts")
    .update({
      access_token: null,
      refresh_token: null,
      token_expires_at: null,
      status: "disconnected",
      error: reason,
    })
    .in("id", accountIds);
  if (error) throw error;
}

async function signOutUsers(supabase: SupabaseClient, userIds: string[]) {
  const unique = [...new Set(userIds)];
  for (const userId of unique) {
    try {
      await supabase.auth.admin.signOut(userId, "global");
    } catch (error) {
      console.error("[risc] signOut failed", userId, error);
    }
  }
}

function firstSubjectSub(events: Record<string, RiscEventPayload>): string | null {
  for (const payload of Object.values(events)) {
    if (payload.subject?.sub) return payload.subject.sub;
  }
  return null;
}

async function handleTokenRevoked(
  supabase: SupabaseClient,
  event: RiscEventPayload,
): Promise<{ accountIds: string[]; userIds: string[] }> {
  const subject = event.subject;
  const accounts = await findGoogleAccountsBySub(supabase, subject?.sub);
  if (accounts.length === 0) return { accountIds: [], userIds: [] };

  const tokenHint = subject?.token;
  const alg = subject?.token_identifier_alg;
  let matched = accounts;

  if (tokenHint && alg) {
    matched = accounts.filter((account) => {
      try {
        const refresh = decryptSecret(account.refresh_token);
        if (!refresh) return false;
        if (alg === "prefix") return refresh.slice(0, 16) === tokenHint;
        if (alg === "hash_base64_sha512_sha512") return doubleSha512Base64(refresh) === tokenHint;
        return false;
      } catch {
        return false;
      }
    });
    // If no match after filtering, fall back to all accounts for this Google sub.
    if (matched.length === 0) matched = accounts;
  }

  return {
    accountIds: matched.map((a) => a.id),
    userIds: matched.map((a) => a.user_id),
  };
}

export async function handleSecurityEvents(
  supabase: SupabaseClient,
  token: RiscSecurityEventToken,
): Promise<{ duplicate: boolean; eventTypes: string[]; actions: string[] }> {
  const jti = token.jti;
  if (!jti) throw new Error("Missing jti");
  const events = token.events ?? {};
  const eventTypes = Object.keys(events);
  const subjectSub = firstSubjectSub(events);

  const { error: claimError } = await supabase.from("risc_security_events").insert({
    jti,
    event_types: eventTypes,
    subject_sub: subjectSub,
  });

  if (claimError) {
    if (claimError.code === "23505") {
      return { duplicate: true, eventTypes, actions: [] };
    }
    throw claimError;
  }

  const actions: string[] = [];
  const accountIdsToDisconnect = new Set<string>();
  const userIdsToSignOut = new Set<string>();

  for (const [eventType, payload] of Object.entries(events)) {
    if (eventType === RISC_EVENT.VERIFICATION) {
      console.info("[risc] verification event", payload.state ?? null);
      actions.push("verification_logged");
      continue;
    }

    if (eventType === RISC_EVENT.CREDENTIAL_CHANGE_REQUIRED) {
      console.info("[risc] credential change required", subjectSub);
      actions.push("credential_change_logged");
      continue;
    }

    if (eventType === RISC_EVENT.ACCOUNT_ENABLED) {
      console.info("[risc] account enabled", subjectSub);
      actions.push("account_enabled_logged");
      continue;
    }

    if (eventType === RISC_EVENT.TOKEN_REVOKED) {
      const matched = await handleTokenRevoked(supabase, payload);
      matched.accountIds.forEach((id) => accountIdsToDisconnect.add(id));
      matched.userIds.forEach((id) => userIdsToSignOut.add(id));
      actions.push("token_revoked");
      continue;
    }

    const shouldResecure =
      eventType === RISC_EVENT.SESSIONS_REVOKED ||
      eventType === RISC_EVENT.TOKENS_REVOKED ||
      (eventType === RISC_EVENT.ACCOUNT_DISABLED &&
        (payload.reason === "hijacking" || !payload.reason));

    if (shouldResecure) {
      const accounts = await findGoogleAccountsBySub(
        supabase,
        payload.subject?.sub ?? subjectSub ?? undefined,
      );
      accounts.forEach((a) => {
        accountIdsToDisconnect.add(a.id);
        userIdsToSignOut.add(a.user_id);
      });
      actions.push(`resecure:${eventType.split("/").pop()}`);
      continue;
    }

    if (eventType === RISC_EVENT.ACCOUNT_DISABLED && payload.reason === "bulk-account") {
      console.info("[risc] account disabled bulk-account", subjectSub);
      actions.push("bulk_account_logged");
      continue;
    }

    console.info("[risc] unhandled event type", eventType);
    actions.push(`ignored:${eventType.split("/").pop()}`);
  }

  const ids = [...accountIdsToDisconnect];
  if (ids.length > 0) {
    await disconnectAccounts(
      supabase,
      ids,
      "Disconnected by Google Cross-Account Protection (RISC)",
    );
    actions.push(`disconnected:${ids.length}`);
  }

  const users = [...userIdsToSignOut];
  if (users.length > 0) {
    await signOutUsers(supabase, users);
    actions.push(`signed_out:${users.length}`);
  }

  await supabase
    .from("risc_security_events")
    .update({ handled_at: new Date().toISOString() })
    .eq("jti", jti);

  return { duplicate: false, eventTypes, actions };
}
