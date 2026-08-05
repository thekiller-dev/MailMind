import { describe, expect, it } from "vitest";
import {
  digestEventId,
  isDigestDue,
  isDigestDueOrCatchUp,
  normalizeDigestTime,
  startOfLocalDay,
} from "./digest-schedule";

describe("digest schedule", () => {
  it("normalise les heures DB HH:MM:SS", () => {
    expect(normalizeDigestTime("18:00:00")).toBe("18:00");
    expect(normalizeDigestTime("8:05")).toBe("08:05");
  });

  it("détecte 18h UTC dans la fenêtre ±14", () => {
    const at1805 = new Date("2026-08-05T18:05:00.000Z");
    expect(isDigestDue("18:00", "UTC", at1805)).toBe("2026-08-05");
    expect(isDigestDue("18:00", "UTC", new Date("2026-08-05T17:30:00.000Z"))).toBeNull();
  });

  it("catch-up : envoie si l’heure locale est déjà passée", () => {
    // Cron Hobby 17:00 UTC : Paris CEST = 19:00 → 18:00 déjà passé
    const cronUtc17 = new Date("2026-08-05T17:00:00.000Z");
    expect(isDigestDueOrCatchUp("18:00", "Europe/Paris", cronUtc17)).toBe("2026-08-05");
    expect(isDigestDueOrCatchUp("18:00", "UTC", cronUtc17)).toBeNull();
    expect(isDigestDueOrCatchUp("17:00", "UTC", cronUtc17)).toBe("2026-08-05");
  });

  it("catch-up : n’envoie pas avant l’heure configurée", () => {
    const morning = new Date("2026-08-05T10:00:00.000Z");
    expect(isDigestDueOrCatchUp("18:00", "UTC", morning)).toBeNull();
  });

  it("calcule le début du jour local", () => {
    const noon = new Date("2026-08-05T12:30:00.000Z");
    const start = startOfLocalDay("UTC", noon);
    expect(start.toISOString()).toBe("2026-08-05T00:00:00.000Z");
  });

  it("sépare les event ids TG/WA", () => {
    expect(digestEventId("telegram", "2026-08-05", "u1")).toBe("digest:telegram:2026-08-05:u1");
    expect(digestEventId("whatsapp", "2026-08-05", "u1")).toBe("digest:whatsapp:2026-08-05:u1");
  });
});
