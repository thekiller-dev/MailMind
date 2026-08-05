import { describe, expect, it } from "vitest";
import { CleanupSchema, cleanupCutoffIso } from "./email-cleanup.shared";

describe("CleanupSchema", () => {
  it("defaults days to 5", () => {
    expect(CleanupSchema.parse({})).toEqual({ days: 5 });
  });

  it("rejects out-of-range days", () => {
    expect(() => CleanupSchema.parse({ days: 0 })).toThrow();
    expect(() => CleanupSchema.parse({ days: 400 })).toThrow();
  });
});

describe("cleanupCutoffIso", () => {
  it("subtracts whole days from now", () => {
    const now = Date.UTC(2026, 7, 5, 12, 0, 0);
    expect(cleanupCutoffIso(5, now)).toBe(new Date(now - 5 * 86_400_000).toISOString());
  });
});
