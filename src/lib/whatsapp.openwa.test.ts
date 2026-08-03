import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  digitsOnlyPhone,
  phoneFromChatId,
  toOpenWaChatId,
  verifyOpenWaSignature,
} from "./openwa.server";
import {
  extractLinkToken,
  resolveWhatsAppCommand,
  sanitizeWhatsAppText,
} from "./whatsapp-commands";
import { isDigestDue } from "./whatsapp-digest.server";
import { normalizeOpenWaIncomingMessage } from "./whatsapp-webhook.server";

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
    const digest = createHmac("sha256", secret).update(body).digest("hex");
    const signature = `sha256=${digest}`;
    expect(verifyOpenWaSignature(body, signature, secret)).toBe(true);
    expect(verifyOpenWaSignature(body, ` ${signature} `, ` ${secret} `)).toBe(true);
    expect(verifyOpenWaSignature(body, digest, secret)).toBe(true);
    expect(verifyOpenWaSignature(body, `v1=${digest}`, secret)).toBe(true);
    expect(verifyOpenWaSignature(body, "sha256=deadbeef", secret)).toBe(false);
    expect(verifyOpenWaSignature(body, null, secret)).toBe(false);
  });
});

describe("whatsapp-commands", () => {
  it("extrait le token de liaison", () => {
    expect(extractLinkToken("LIEN abc.def")).toBe("abc.def");
    expect(extractLinkToken("/start abc.def")).toBe("abc.def");
    expect(extractLinkToken("/lien abc.def")).toBe("abc.def");
    expect(extractLinkToken("\u200BLIEN\u200B tok-en_1")).toBe("tok-en_1");
    expect(extractLinkToken("bonjour")).toBeNull();
  });

  it("résout les commandes et le langage naturel", () => {
    expect(resolveWhatsAppCommand("LIEN tok")).toBe("/start");
    expect(resolveWhatsAppCommand("/aide")).toBe("/help");
    expect(resolveWhatsAppCommand("montre mes derniers mails")).toBe("/recents");
    expect(resolveWhatsAppCommand("y a-t-il une urgence ?")).toBe("/urgent");
  });

  it("nettoie les caractères invisibles WhatsApp", () => {
    expect(sanitizeWhatsAppText("\uFEFF LIEN abc \u200B")).toBe("LIEN abc");
  });
});

describe("normalizeOpenWaIncomingMessage", () => {
  it("lit le payload documenté OpenWA (data.from + data.body)", () => {
    expect(
      normalizeOpenWaIncomingMessage({
        event: "message.received",
        sessionId: "main",
        data: {
          id: "3EB0",
          from: "33612345678@c.us",
          body: "LIEN abc",
          isGroup: false,
        },
      }),
    ).toMatchObject({
      body: "LIEN abc",
      chatId: "33612345678@c.us",
      fromMe: false,
      isGroup: false,
    });
  });

  it("accepte chatId / text et l’enveloppe message", () => {
    expect(
      normalizeOpenWaIncomingMessage({
        event: "message.received",
        data: {
          chatId: "33699999999@s.whatsapp.net",
          text: "  LIEN tok  ",
        },
      }),
    ).toMatchObject({
      body: "LIEN tok",
      chatId: "33699999999@s.whatsapp.net",
    });

    expect(
      normalizeOpenWaIncomingMessage({
        message: {
          from: "1@c.us",
          caption: "LIEN cap",
          fromMe: true,
        },
      }),
    ).toMatchObject({
      body: "LIEN cap",
      chatId: "1@c.us",
      fromMe: true,
    });
  });

  it("détecte les groupes via kind ou suffixe @g.us", () => {
    expect(
      normalizeOpenWaIncomingMessage({
        data: { from: "120363@g.us", body: "hi" },
      }).isGroup,
    ).toBe(true);
  });

  it("accepte l’enveloppe nested payload (variante websocket)", () => {
    expect(
      normalizeOpenWaIncomingMessage({
        payload: {
          event: "message.received",
          data: { from: "33611111111@c.us", body: "LIEN nested" },
        },
      }),
    ).toMatchObject({
      body: "LIEN nested",
      chatId: "33611111111@c.us",
      fromMe: false,
    });
  });
});

describe("whatsapp digest schedule", () => {
  it("accepte une fenêtre de ±14 minutes", () => {
    const noonUtc = new Date("2026-08-03T08:05:00.000Z");
    expect(isDigestDue("08:00", "UTC", noonUtc)).toBe("2026-08-03");
    expect(isDigestDue("10:00", "UTC", noonUtc)).toBeNull();
  });
});
