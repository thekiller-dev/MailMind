import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Client HTTP vers un serveur OpenWA distant.
 * API documentée : POST /api/sessions/:sessionId/messages/send-text
 * Auth : header X-API-Key (jamais en query).
 * @see https://github.com/rmyndharis/OpenWA/blob/main/docs/06-api-specification.md
 */

export type OpenWaConfig = {
  baseUrl: string;
  apiKey: string;
  sessionId: string;
};

export function getOpenWaConfig(): OpenWaConfig | null {
  const baseUrl = process.env.OPENWA_BASE_URL?.replace(/\/+$/, "").trim();
  const apiKey = process.env.OPENWA_API_KEY?.trim();
  const sessionId = process.env.OPENWA_SESSION_ID?.trim();
  if (!baseUrl || !apiKey || !sessionId) return null;
  return { baseUrl, apiKey, sessionId };
}

export function isOpenWaConfigured(): boolean {
  return getOpenWaConfig() !== null;
}

/** Normalise un numéro affiché / wa.me (chiffres seuls, sans +). */
export function digitsOnlyPhone(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * OpenWA accepte des JID `@c.us` (whatsapp-web.js) ou `@s.whatsapp.net` (Baileys).
 * On conserve le JID tel que reçu ; pour un numéro nu on suffixe `@c.us` (défaut wwebjs).
 */
export function toOpenWaChatId(chatOrPhone: string): string {
  const trimmed = chatOrPhone.trim();
  if (trimmed.includes("@")) return trimmed;
  const digits = digitsOnlyPhone(trimmed);
  if (!digits) throw new Error("Identifiant WhatsApp invalide");
  return `${digits}@c.us`;
}

export function phoneFromChatId(chatId: string): string | null {
  const local = chatId.split("@", 1)[0] ?? "";
  const digits = digitsOnlyPhone(local);
  return digits || null;
}

export function verifyOpenWaSignature(
  rawBody: string | Buffer | Uint8Array,
  signatureHeader: string | null | undefined,
  secret: string,
): boolean {
  if (!signatureHeader || !secret) return false;
  const expected =
    "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(signatureHeader);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function sendOpenWaText(chatId: string, text: string): Promise<void> {
  const config = getOpenWaConfig();
  if (!config) return;

  const response = await fetch(
    `${config.baseUrl}/api/sessions/${encodeURIComponent(config.sessionId)}/messages/send-text`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-API-Key": config.apiKey,
      },
      body: JSON.stringify({
        chatId: toOpenWaChatId(chatId),
        text: text.slice(0, 4096),
      }),
    },
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`OpenWA send-text failed: ${response.status} ${detail.slice(0, 200)}`);
  }
}
