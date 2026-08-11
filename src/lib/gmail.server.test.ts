import { afterEach, describe, expect, it, vi } from "vitest";
import {
  extractEmailAddress,
  GmailHistoryExpiredError,
  listHistoryMessageIds,
  refreshAccessToken,
} from "./gmail.server";

describe("Gmail OAuth helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("extracts an address from a From header", () => {
    expect(extractEmailAddress("Sarah Jenkins <sarah@northwind.co>")).toBe("sarah@northwind.co");
    expect(extractEmailAddress("plain@example.com")).toBe("plain@example.com");
  });

  it("deduplicates added messages across Gmail history pages", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          history: [{ messagesAdded: [{ message: { id: "m1" } }] }],
          historyId: "11",
          nextPageToken: "next",
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          history: [
            {
              messagesAdded: [{ message: { id: "m1" } }, { message: { id: "m2" } }],
            },
          ],
          historyId: "12",
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(listHistoryMessageIds("token", "10")).resolves.toEqual({
      historyId: "12",
      messageIds: ["m1", "m2"],
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondUrl = String(fetchMock.mock.calls[1]?.[0] ?? "");
    expect(secondUrl).toContain("pageToken=next");
  });

  it("returns empty message ids when history has no messagesAdded", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ history: [], historyId: "42" })),
    );
    await expect(listHistoryMessageIds("token", "40")).resolves.toEqual({
      historyId: "42",
      messageIds: [],
    });
  });

  it("signals an expired Gmail history cursor", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
    await expect(listHistoryMessageIds("token", "expired")).rejects.toBeInstanceOf(
      GmailHistoryExpiredError,
    );
  });

  it("throws a generic error for non-404 history failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("boom", { status: 500 })));
    try {
      await listHistoryMessageIds("token", "10");
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).not.toBeInstanceOf(GmailHistoryExpiredError);
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toMatch(/Gmail history failed: 500/);
    }
  });

  it("surfaces Google token refresh HTTP failures", async () => {
    vi.stubEnv("GOOGLE_OAUTH_CLIENT_ID", "client");
    vi.stubEnv("GOOGLE_OAUTH_CLIENT_SECRET", "secret");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("bad", { status: 401 })));
    await expect(refreshAccessToken("refresh-token")).rejects.toThrow(
      /Google token refresh failed: 401/,
    );
  });
});
