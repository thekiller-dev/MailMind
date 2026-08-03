import { afterEach, describe, expect, it, vi } from "vitest";
import {
  extractEmailAddress,
  GmailHistoryExpiredError,
  listHistoryMessageIds,
} from "./gmail.server";

describe("Gmail OAuth helpers", () => {
  afterEach(() => vi.unstubAllGlobals());

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
  });

  it("signals an expired Gmail history cursor", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
    await expect(listHistoryMessageIds("token", "expired")).rejects.toBeInstanceOf(
      GmailHistoryExpiredError,
    );
  });
});
