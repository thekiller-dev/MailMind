import { beforeEach, describe, expect, it } from "vitest";
import { extractEmailAddress, signState, verifyState } from "./gmail.server";

describe("Gmail OAuth helpers", () => {
  beforeEach(() => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-oauth-state-secret";
  });

  it("signs and verifies a non-expired OAuth state", () => {
    const state = signState({
      user_id: "user-1",
      nonce: "nonce-1",
      exp: Math.floor(Date.now() / 1000) + 60,
      origin: "http://localhost:5000",
    });
    expect(verifyState(state)).toEqual({ user_id: "user-1", origin: "http://localhost:5000" });
  });

  it("rejects expired or modified OAuth states", () => {
    const expired = signState({
      user_id: "user-1",
      nonce: "nonce-1",
      exp: Math.floor(Date.now() / 1000) - 1,
      origin: "http://localhost:5000",
    });
    expect(verifyState(expired)).toBeNull();
    expect(verifyState(`${expired}x`)).toBeNull();
  });

  it("extracts an address from a From header", () => {
    expect(extractEmailAddress("Sarah Jenkins <sarah@northwind.co>")).toBe("sarah@northwind.co");
    expect(extractEmailAddress("plain@example.com")).toBe("plain@example.com");
  });
});
