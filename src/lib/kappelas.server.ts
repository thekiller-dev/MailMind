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

export function verifyKappelasWebhookSecret(header: string | null): boolean {
  const expected = process.env.KAPPELAS_WEBHOOK_SECRET?.trim();
  if (!expected) return false;
  if (!header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function sendKappelasText(chatId: number, text: string): Promise<void> {
  const bot = createKappelasBot();
  await bot.messages.send({
    chat_id: chatId,
    text: text.slice(0, 3900),
  });
}

/** Optional HMAC helper if Kappela later signs bodies; currently secret is header-only. */
export function signKappelasBody(rawBody: string, secret: string): string {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}
