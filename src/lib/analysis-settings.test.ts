import { describe, expect, it } from "vitest";
import {
  applyAnalysisSettings,
  areAiRepliesEnabled,
  getAnalysisInstruction,
  isWithinQuietHours,
} from "./analysis-settings";

describe("analysis settings", () => {
  it("adjusts risk scores within the accepted range", () => {
    const result = applyAnalysisSettings(
      { category: "Sécurité", risk_score: 0.5, risk_reason: "Lien inhabituel." },
      { phishingSensitivity: 100 },
    );

    expect(result.risk_score).toBe(0.7);
    expect(result.risk_reason).toContain("sensibilité phishing");
  });

  it("builds explicit prompt preferences", () => {
    expect(
      getAnalysisInstruction({
        phishingSensitivity: 90,
        urgencySensitivity: 60,
        noiseSensitivity: 30,
      }),
    ).toContain("90/100");
  });

  it("requires an explicit opt-in for AI replies", () => {
    expect(areAiRepliesEnabled({ aiReplies: true })).toBe(true);
    expect(areAiRepliesEnabled({ aiReplies: false })).toBe(false);
    expect(areAiRepliesEnabled(null)).toBe(false);
  });

  it("handles quiet hours that cross midnight", () => {
    const settings = {
      quietStart: "22:00",
      quietEnd: "07:00",
      timezone: "UTC",
    };

    expect(isWithinQuietHours(settings, new Date("2026-08-02T23:00:00Z"))).toBe(true);
    expect(isWithinQuietHours(settings, new Date("2026-08-02T12:00:00Z"))).toBe(false);
  });
});
