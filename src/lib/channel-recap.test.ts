import { describe, expect, it } from "vitest";
import { deriveEmailAction, isSecurityAlert } from "./channel-notify-shared";

describe("deriveEmailAction", () => {
  it("prefers explicit intent", () => {
    expect(deriveEmailAction({ intent: "Répondre avant vendredi", category: "Urgent" })).toBe(
      "Répondre avant vendredi",
    );
  });

  it("falls back for urgent and security categories", () => {
    expect(deriveEmailAction({ intent: null, category: "Urgent" })).toBe("Traiter en priorité");
    expect(deriveEmailAction({ intent: "  ", category: "Phishing" })).toBe(
      "Vérifier avant toute action",
    );
    expect(deriveEmailAction({ intent: null, category: "Sécurité" })).toBe(
      "Vérifier avant toute action",
    );
  });

  it("uses a generic action otherwise", () => {
    expect(deriveEmailAction({ intent: null, category: "Finance" })).toBe(
      "Consulter dans MailMind",
    );
  });
});

describe("isSecurityAlert", () => {
  it("flags phishing, security and high risk", () => {
    expect(isSecurityAlert({ category: "Phishing", risk_score: 0.1 })).toBe(true);
    expect(isSecurityAlert({ category: "Sécurité", risk_score: 0 })).toBe(true);
    expect(isSecurityAlert({ category: "Autre", risk_score: 0.6 })).toBe(true);
    expect(isSecurityAlert({ category: "Autre", risk_score: 0.5 })).toBe(false);
  });
});
