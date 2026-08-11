import { describe, expect, it } from "vitest";
import { extractKappelasLinkToken, resolveKappelasCommand } from "./kappelas-commands";

describe("kappelas command helpers", () => {
  it("extracts /start and LIEN tokens", () => {
    expect(extractKappelasLinkToken("/start abc123")).toBe("abc123");
    expect(extractKappelasLinkToken("/start@mailmind_bot tok")).toBe("tok");
    expect(extractKappelasLinkToken("LIEN xyz")).toBe("xyz");
    expect(extractKappelasLinkToken("LINK xyz")).toBe("xyz");
    expect(extractKappelasLinkToken("hello")).toBeNull();
  });

  it("parses slash commands with optional argument", () => {
    expect(resolveKappelasCommand("/help")).toEqual({ command: "/help", argument: undefined });
    expect(resolveKappelasCommand("/archive ab12cd34")).toEqual({
      command: "/archive",
      argument: "ab12cd34",
    });
    expect(resolveKappelasCommand("pas une commande")).toBeNull();
  });
});
