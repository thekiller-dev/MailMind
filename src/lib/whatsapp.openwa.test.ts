import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  digitsOnlyPhone,
  phoneFromChatId,
  toOpenWaChatId,
  verifyOpenWaSignature,
} from "./openwa.server";
import { extractLinkToken, resolveWhatsAppCommand } from "./whatsapp-commands";
import { isDigestDue } from "./whatsapp-digest.server";

describe("openwa.server helpers", () => {
  it("normalise les chatId OpenWA", () => {
    expect(toOpenWaChatId("33612345678")).toBe("33612345678@c.us");
    expect(toOpenWaChatId("33612345678@c.us")).toBe("33612345678@c.us");
    expect(toOpenWaChatId("33612345678@s.whatsapp.net")).toBe("33612345678@s.whatsapp.net");
    expect(digitsOnlyPhone("+33 6 12 34 56 78")).toBe("33612345678");
    expect(phoneFromChatId("33612345678@c.us")).toBe("33612345678");
  });

  it("vérifie la signature HMAC OpenWA en timing-safe", () => {
    const body = '{"event":"message.received","data":{"body":"hi"}}';
    const secret = "test-secret";
    const signature =
      "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
    expect(verifyOpenWaSignature(body, signature, secret)).toBe(true);
    expect(verifyOpenWaSignature(body, "sha256=deadbeef", secret)).toBe(false);
    expect(verifyOpenWaSignature(body, null, secret)).toBe(false);
  });
});

describe("whatsapp-commands", () => {
  it("extrait le token de liaison", () => {
    expect(extractLinkToken("LIEN abc.def")).toBe("abc.def");
    expect(extractLinkToken("/start abc.def")).toBe("abc.def");
    expect(extractLinkToken("/lien abc.def")).toBe("abc.def");
    expect(extractLinkToken("bonjour")).toBeNull();
  });

  it("résout les commandes et le langage naturel", () => {
    expect(resolveWhatsAppCommand("LIEN tok")).toBe("/start");
    expect(resolveWhatsAppCommand("/aide")).toBe("/help");
    expect(resolveWhatsAppCommand("montre mes derniers mails")).toBe("/recents");
    expect(resolveWhatsAppCommand("y a-t-il une urgence ?")).toBe("/urgent");
  });
});

describe("whatsapp digest schedule", () => {
  it("accepte une fenêtre de ±14 minutes", () => {
    const noonUtc = new Date("2026-08-03T08:05:00.000Z");
    expect(isDigestDue("08:00", "UTC", noonUtc)).toBe("2026-08-03");
    expect(isDigestDue("10:00", "UTC", noonUtc)).toBeNull();
  });
});
