import { describe, expect, it } from "vitest";
import { formatDigest60Seconds, shortEmailRef, shouldSilenceRecap } from "./product-insights";

describe("shouldSilenceRecap", () => {
  it("ne coupe rien si smartSilence est désactivé", () => {
    expect(
      shouldSilenceRecap({
        smartSilence: false,
        category: "Notification",
        riskScore: 0,
        engagement: "none",
      }),
    ).toBe(false);
  });

  it("coupe le bruit (notif/commercial) sans engagement ni risque", () => {
    expect(
      shouldSilenceRecap({
        smartSilence: true,
        category: "Notification",
        riskScore: 0.1,
        engagement: "none",
      }),
    ).toBe(true);
  });

  it("laisse passer urgence ou risque élevé", () => {
    expect(
      shouldSilenceRecap({
        smartSilence: true,
        category: "Urgent",
        riskScore: 0,
        engagement: "none",
      }),
    ).toBe(false);
    expect(
      shouldSilenceRecap({
        smartSilence: true,
        category: "Notification",
        riskScore: 0.7,
        engagement: "none",
      }),
    ).toBe(false);
  });
});

describe("formatDigest60Seconds", () => {
  const emails = [
    {
      subject: "Facture <urgente>",
      summary: "Payer avant vendredi",
      category: "Urgent",
      risk_score: 0.2,
    },
  ];

  it("échappe le HTML", () => {
    const text = formatDigest60Seconds({ emails, analyzedCount: 10, markup: "html" });
    expect(text).toContain("<b>Digest du jour — 60 secondes</b>");
    expect(text).toContain("Facture &lt;urgente&gt;");
  });

  it("formate en markdown", () => {
    const text = formatDigest60Seconds({ emails, analyzedCount: 10, markup: "md" });
    expect(text).toContain("*Digest du jour — 60 secondes*");
  });
});

describe("shortEmailRef", () => {
  it("prend les 8 premiers hex sans tirets", () => {
    expect(shortEmailRef("ab12cd34-5678-90ab-cdef-1234567890ab")).toBe("ab12cd34");
  });
});
