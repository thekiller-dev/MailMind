import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const PREFIX = "enc:v1:";
const ALGORITHM = "aes-256-gcm";

function encryptionKey() {
  const configured = process.env.TOKEN_ENCRYPTION_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!configured) {
    throw new Error("Missing TOKEN_ENCRYPTION_KEY or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createHash("sha256").update(configured).digest();
}

export function isEncryptedSecret(value: string | null | undefined): boolean {
  return !!value?.startsWith(PREFIX);
}

export function encryptSecret(value: string | null | undefined): string | null {
  if (!value) return value ?? null;
  if (isEncryptedSecret(value)) return value;

  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptSecret(value: string | null | undefined): string | null {
  if (!value) return value ?? null;
  if (!isEncryptedSecret(value)) return value;

  const [iv, tag, encrypted] = value.slice(PREFIX.length).split(".");
  if (!iv || !tag || !encrypted) throw new Error("Invalid encrypted secret");

  const decipher = createDecipheriv(ALGORITHM, encryptionKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
