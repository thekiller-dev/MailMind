import { beforeEach, describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, isEncryptedSecret } from "./secret-crypto.server";

describe("server secret encryption", () => {
  beforeEach(() => {
    process.env.TOKEN_ENCRYPTION_KEY = "test-only-token-encryption-key";
  });

  it("encrypts and decrypts a secret", () => {
    const encrypted = encryptSecret("gmail-access-token");
    expect(encrypted).not.toBe("gmail-access-token");
    expect(isEncryptedSecret(encrypted)).toBe(true);
    expect(decryptSecret(encrypted)).toBe("gmail-access-token");
  });

  it("does not double-encrypt an existing value", () => {
    const encrypted = encryptSecret("refresh-token");
    expect(encryptSecret(encrypted)).toBe(encrypted);
  });

  it("keeps legacy plaintext readable for migration", () => {
    expect(decryptSecret("legacy-token")).toBe("legacy-token");
    expect(isEncryptedSecret("legacy-token")).toBe(false);
  });

  it("rejects a tampered ciphertext", () => {
    const encrypted = encryptSecret("secret-value") ?? "";
    expect(() => decryptSecret(`${encrypted}tampered`)).toThrow();
  });
});
