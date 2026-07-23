import { describe, expect, it } from "vitest";
import { htmlToText, readableEmailBody } from "./email-content";

describe("email content normalization", () => {
  it("converts HTML emails into readable text", () => {
    expect(
      readableEmailBody("<style>.x{color:red}</style><h1>Bonjour</h1><p>Voir&nbsp;la facture</p>"),
    ).toBe("Bonjour\nVoir la facture");
  });

  it("keeps regular plain text unchanged", () => {
    expect(readableEmailBody("Bonjour\n\nVoici le contenu.")).toBe("Bonjour\n\nVoici le contenu.");
  });

  it("does not leave tags or tracking comments", () => {
    expect(htmlToText("<!-- hidden --><div>Une <strong>offre</strong></div>")).toBe("Une offre");
  });
});
