import { afterEach, describe, expect, it, vi } from "vitest";
import { maybeSendOpsAlert } from "./sync-ops.server";

describe("ops alerts", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("skips webhook when below threshold and nothing stuck", async () => {
    vi.stubEnv("OPS_ALERT_WEBHOOK_URL", "https://example.com/hook");
    vi.stubEnv("OPS_ALERT_FAILED_THRESHOLD", "3");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      maybeSendOpsAlert({ failedLast24h: 1, stuckPending: 0, sampleErrors: [] }),
    ).resolves.toEqual({ sent: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts webhook when failures reach threshold", async () => {
    vi.stubEnv("OPS_ALERT_WEBHOOK_URL", "https://example.com/hook");
    vi.stubEnv("OPS_ALERT_FAILED_THRESHOLD", "2");
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      maybeSendOpsAlert({
        failedLast24h: 2,
        stuckPending: 0,
        sampleErrors: ["token expired"],
      }),
    ).resolves.toEqual({ sent: true });
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
