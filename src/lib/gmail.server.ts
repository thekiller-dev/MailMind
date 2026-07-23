// Server-only Gmail OAuth + API helpers.
import { createHmac, timingSafeEqual } from "node:crypto";
import { htmlToText } from "./email-content";

const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO = "https://openidconnect.googleapis.com/v1/userinfo";
const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

export const GMAIL_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.send",
].join(" ");

function stateSecret(): string {
  const s = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_JWKS || "";
  if (!s) throw new Error("Missing signing key for OAuth state");
  return s;
}

export function signState(payload: {
  user_id: string;
  nonce: string;
  exp: number;
  origin: string;
}): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", stateSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyState(state: string): { user_id: string; origin: string } | null {
  const [body, sig] = state.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", stateSecret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
      user_id: string;
      exp: number;
      origin: string;
    };
    if (Date.now() / 1000 > p.exp || !p.user_id || !p.origin) return null;
    return { user_id: p.user_id, origin: p.origin };
  } catch {
    return null;
  }
}

export function requireGoogleEnv() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Missing Google OAuth credentials");
  return { clientId, clientSecret };
}

export function buildAuthUrl(redirectUri: string, state: string): string {
  const { clientId } = requireGoogleEnv();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GMAIL_SCOPES,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `${GOOGLE_AUTH}?${params.toString()}`;
}

export async function exchangeCode(code: string, redirectUri: string) {
  const { clientId, clientSecret } = requireGoogleEnv();
  const res = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope: string;
    token_type: string;
    id_token?: string;
  };
}

export async function refreshAccessToken(refreshToken: string) {
  const { clientId, clientSecret } = requireGoogleEnv();
  const res = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Google token refresh failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as {
    access_token: string;
    expires_in: number;
    scope: string;
    token_type: string;
  };
}

export async function fetchUserinfo(accessToken: string) {
  const res = await fetch(GOOGLE_USERINFO, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("userinfo fetch failed");
  return (await res.json()) as { sub: string; email: string; name?: string; picture?: string };
}

export async function listMessageIds(
  accessToken: string,
  opts: { maxResults?: number; q?: string } = {},
): Promise<string[]> {
  const requested = Math.min(Math.max(opts.maxResults ?? 100, 1), 500);
  const ids: string[] = [];
  let pageToken: string | undefined;

  while (ids.length < requested) {
    const params = new URLSearchParams({
      maxResults: String(Math.min(100, requested - ids.length)),
      q: opts.q ?? process.env.GMAIL_SYNC_QUERY ?? "in:inbox newer_than:14d",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const res = await fetch(`${GMAIL_API}/messages?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`Gmail list failed: ${res.status}`);
    const data = (await res.json()) as { messages?: { id: string }[]; nextPageToken?: string };
    ids.push(...(data.messages ?? []).map((m) => m.id));
    if (!data.nextPageToken || !data.messages?.length) break;
    pageToken = data.nextPageToken;
  }

  return ids.slice(0, requested);
}

export interface GmailMessage {
  id: string;
  threadId: string;
  sender: string;
  subject: string;
  snippet: string;
  body: string;
  receivedAt: string;
}

function b64urlDecode(input: string): string {
  const s = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  try {
    return Buffer.from(s + pad, "base64").toString("utf8");
  } catch {
    return "";
  }
}

function b64urlEncode(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function extractBody(payload: unknown): string {
  const p = payload as { mimeType?: string; body?: { data?: string }; parts?: unknown[] };
  if (!p) return "";
  if (p.body?.data && (!p.mimeType || p.mimeType.startsWith("text/"))) {
    return p.mimeType === "text/html"
      ? htmlToText(b64urlDecode(p.body.data))
      : b64urlDecode(p.body.data);
  }
  if (Array.isArray(p.parts))
    for (const part of p.parts) {
      const r = extractBody(part);
      if (r) return r;
    }
  return "";
}

export async function fetchMessage(accessToken: string, id: string): Promise<GmailMessage> {
  const res = await fetch(`${GMAIL_API}/messages/${id}?format=full`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Gmail get failed: ${res.status}`);
  const m = (await res.json()) as {
    id: string;
    threadId: string;
    snippet: string;
    internalDate: string;
    payload: { headers: { name: string; value: string }[] };
  };
  const headers = m.payload?.headers ?? [];
  const h = (n: string) =>
    headers.find((x) => x.name.toLowerCase() === n.toLowerCase())?.value ?? "";
  const raw = extractBody(m.payload).slice(0, 8000);
  return {
    id: m.id,
    threadId: m.threadId,
    sender: h("From") || "unknown",
    subject: h("Subject") || "(sans objet)",
    snippet: m.snippet ?? "",
    body: raw || m.snippet || "",
    receivedAt: new Date(Number(m.internalDate) || Date.now()).toISOString(),
  };
}

export async function modifyMessage(accessToken: string, id: string, action: "archive" | "spam") {
  const body = action === "archive" ? { removeLabelIds: ["INBOX"] } : { addLabelIds: ["SPAM"] };
  const res = await fetch(`${GMAIL_API}/messages/${id}/modify`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Gmail modify failed: ${res.status}`);
}

export async function sendReply(
  accessToken: string,
  input: { threadId: string; to: string; subject: string; body: string },
) {
  if (/\r|\n/.test(input.to) || /\r|\n/.test(input.subject)) {
    throw new Error("Invalid reply headers");
  }
  const raw = [
    `To: ${input.to}`,
    `Subject: ${input.subject.startsWith("Re:") ? input.subject : `Re: ${input.subject}`}`,
    "Content-Type: text/plain; charset=UTF-8",
    "MIME-Version: 1.0",
    "",
    input.body.replace(/\r?\n/g, "\r\n"),
  ].join("\r\n");
  const res = await fetch(`${GMAIL_API}/messages/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: b64urlEncode(raw), threadId: input.threadId }),
  });
  if (!res.ok) throw new Error(`Gmail send failed: ${res.status}`);
}

export function extractEmailAddress(header: string): string {
  const match = header.match(/<([^>]+)>/);
  return (match?.[1] ?? header).trim();
}
