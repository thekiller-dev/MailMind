import { describe, expect, it } from "vitest";
import { computeSyncRetrySleepSeconds } from "./gmail-sync-queue.server";

describe("gmail sync queue backoff", () => {
  it("doubles sleep seconds per attempt", () => {
    expect(computeSyncRetrySleepSeconds(1)).toBe(30);
    expect(computeSyncRetrySleepSeconds(2)).toBe(60);
    expect(computeSyncRetrySleepSeconds(3)).toBe(120);
  });

  it("caps backoff at 15 minutes", () => {
    expect(computeSyncRetrySleepSeconds(10)).toBe(15 * 60);
  });
});
