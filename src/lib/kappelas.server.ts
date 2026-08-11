import { createHmac, timingSafeEqual } from "node:crypto";
import { KappelaBot } from "@kappelas/sdk";

export function isKappelasConfigured(): boolean {
  return Boolean(process.env.KAPPELAS_BOT_TOKEN?.trim());
}

export function getKappelasBotUsername(): string | null {
  const username = process.env.KAPPELAS_BOT_USERNAME?.replace(/^@/, "").trim();
  return username || null;
}

/** Deep link to open the bot in Kappela (user then sends /start &lt;token&gt; or LIEN &lt;token&gt;). */
export function buildKappelasBotLink(token?: string): string | null {
  const username = getKappelasBotUsername();
  if (!username) return null;
  const base = `https://kappelas.com/bot/${encodeURIComponent(username)}`;
  return token ? `${base}?start=${encodeURIComponent(token)}` : base;
}

export function createKappelasBot(): KappelaBot {
  const token = process.env.KAPPELAS_BOT_TOKEN?.trim();
  if (!token) throw new Error("KAPPELAS_BOT_TOKEN manquant");
  return new KappelaBot({ token });
}

function secretsEqual(provided: string | null | undefined, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Kappelas docs say the shared secret is sent as `X-Webhook-Secret`.
 * In practice deliveries sometimes omit that header, so we also accept
 * `Authorization: Bearer <secret>` and `?secret=` / `?token=` query params.
 */
export function verifyKappelasWebhookRequest(request: Request): boolean {
  const expected = process.env.KAPPELAS_WEBHOOK_SECRET?.trim();
  if (!expected) return false;

  const headerCandidates = [
    request.headers.get("x-webhook-secret"),
    request.headers.get("webhook-secret"),
    request.headers.get("x-kappelas-secret"),
  ];
  if (headerCandidates.some((value) => secretsEqual(value, expected))) return true;

  const auth = request.headers.get("authorization")?.trim();
  if (auth) {
    const bearer = /^Bearer\s+(.+)$/i.exec(auth)?.[1]?.trim();
    if (secretsEqual(bearer, expected) || secretsEqual(auth, expected)) return true;
  }

  try {
    const url = new URL(request.url);
    if (
      secretsEqual(url.searchParams.get("secret"), expected) ||
      secretsEqual(url.searchParams.get("token"), expected)
    ) {
      return true;
    }
  } catch {
    // ignore malformed URL
  }

  return false;
}

/** @deprecated Prefer verifyKappelasWebhookRequest */
export function verifyKappelasWebhookSecret(header: string | null): boolean {
  const expected = process.env.KAPPELAS_WEBHOOK_SECRET?.trim();
  if (!expected) return false;
  return secretsEqual(header, expected);
}

export async function sendKappelasText(chatId: number, text: string): Promise<void> {
  const bot = createKappelasBot();
  try {
    await bot.messages.send({
      chat_id: chatId,
      text: text.slice(0, 3900),
    });
  } catch (error) {
    const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    throw new Error(`Kappelas send failed (chat_id=${chatId}): ${detail}`);
  }
}

/** Optional HMAC helper if Kappela later signs bodies; currently secret is header-only. */
export function signKappelasBody(rawBody: string, secret: string): string {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}
