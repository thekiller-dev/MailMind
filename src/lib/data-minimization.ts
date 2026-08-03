const SECRET_ASSIGNMENT =
  /\b(api[\s_-]?key|access[\s_-]?token|refresh[\s_-]?token|password|passwd|secret)\s*[:=]\s*["']?[^\s"'&,;]+/gi;
const BEARER_TOKEN = /\bBearer\s+[A-Za-z0-9._~+/=-]{16,}/gi;
const IBAN = /\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]){11,30}\b/g;
const PAYMENT_CARD = /\b(?:\d[ -]*?){13,19}\b/g;
const SENSITIVE_QUERY_PARAM = /([?&](?:token|key|secret|signature|code|password)=)[^&#\s]+/gi;

export interface MinimizedEmailInput {
  sender: string;
  subject: string;
  body: string;
}

function redactSensitiveValue(value: string): string {
  return value
    .replace(SECRET_ASSIGNMENT, (_match, key: string) => `${key}=[REDACTED]`)
    .replace(BEARER_TOKEN, "Bearer [REDACTED]")
    .replace(IBAN, "[IBAN REDACTED]")
    .replace(PAYMENT_CARD, "[PAYMENT CARD REDACTED]")
    .replace(SENSITIVE_QUERY_PARAM, "$1[REDACTED]");
}

export function minimizeEmailForAi(
  input: MinimizedEmailInput,
  maxBodyChars = Number(process.env.AI_BODY_MAX_CHARS ?? 4000),
): MinimizedEmailInput {
  const bodyLimit = Number.isFinite(maxBodyChars)
    ? Math.min(Math.max(Math.trunc(maxBodyChars), 500), 8000)
    : 4000;

  return {
    sender: redactSensitiveValue(input.sender).slice(0, 200),
    subject: redactSensitiveValue(input.subject).slice(0, 300),
    body: redactSensitiveValue(input.body).slice(0, bodyLimit),
  };
}
