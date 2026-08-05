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

/**
 * OpenWA documente `X-OpenWA-Signature: sha256=<hex>` (HMAC du corps brut).
 * On accepte aussi hex nu et préfixes `sha256=` / `v1=` / `v1,` pour tolérer
 * les variantes rencontrées en prod / docs connexes.
 */
function normalizeOpenWaSignatureCandidates(header: string): string[] {
  const trimmed = header.trim();
  if (!trimmed) return [];
  const candidates = new Set<string>([trimmed]);
  for (const part of trimmed.split(/\s+/)) {
    const token = part.trim();
    if (!token) continue;
    candidates.add(token);
    const prefixed = /^(?:sha256=|v1=|v1,)(.+)$/i.exec(token);
    if (prefixed?.[1]) candidates.add(prefixed[1].trim());
  }
  return [...candidates];
}

function timingSafeEqualString(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function verifyOpenWaSignature(
  rawBody: string | Buffer | Uint8Array,
  signatureHeader: string | null | undefined,
  secret: string,
): boolean {
  const trimmedSecret = secret.trim();
  if (!trimmedSecret || !signatureHeader?.trim()) return false;

  const digestHex = createHmac("sha256", trimmedSecret).update(rawBody).digest("hex");
  const expectedVariants = [`sha256=${digestHex}`, digestHex, `v1=${digestHex}`];

  for (const candidate of normalizeOpenWaSignatureCandidates(signatureHeader)) {
    for (const expected of expectedVariants) {
      if (timingSafeEqualString(candidate, expected)) return true;
    }
  }
  return false;
}

export async function sendOpenWaText(chatId: string, text: string): Promise<void> {
  const config = getOpenWaConfig();
  if (!config) {
    // Avant : return silencieux → webhook 200, aucune réponse WhatsApp, liaison « fantôme ».
    throw new Error(
      "OpenWA non configuré (OPENWA_BASE_URL / OPENWA_API_KEY / OPENWA_SESSION_ID)",
    );
  }

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
