import { describe, expect, it } from "vitest";
import {
  buildPreferenceAnalysis,
  getPreferenceList,
  matchesSenderList,
  normalizeEmailAddress,
} from "./business-rules";

describe("MailMind business rules", () => {
  describe("matchesSenderList", () => {
    it("matches an email address case-insensitively", () => {
      expect(matchesSenderList("Sarah.Jenkins@Northwind.co", ["sarah.jenkins@northwind.co"])).toBe(
        true,
      );
    });

    it("matches a domain inside a From header", () => {
      expect(matchesSenderList("Sarah Jenkins <sarah@northwind.co>", ["northwind.co"])).toBe(true);
    });

    it("ignores invalid preference entries", () => {
      expect(matchesSenderList("hello@example.com", [null, "", 42, "other.com"])).toBe(false);
      expect(matchesSenderList("hello@example.com", null)).toBe(false);
    });
  });

  it("reads only valid preference containers", () => {
    expect(getPreferenceList({ whitelist: ["example.com"] }, "whitelist")).toEqual(["example.com"]);
    expect(getPreferenceList([], "whitelist")).toBeNull();
    expect(getPreferenceList(null, "blacklist")).toBeNull();
  });

  it("builds deterministic whitelist and blacklist analyses", () => {
    expect(buildPreferenceAnalysis("whitelist")).toMatchObject({
      category: "Autre",
      risk_score: 0,
      sentiment: "neutre",
    });
    expect(buildPreferenceAnalysis("blacklist")).toMatchObject({
      category: "Phishing",
      risk_score: 1,
      sentiment: "négatif",
    });
  });

  it("normalizes account email addresses", () => {
    expect(normalizeEmailAddress("  USER@Example.COM ")).toBe("user@example.com");
  });
});
