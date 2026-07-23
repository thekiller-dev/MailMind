export type PreferenceSettings = {
  whitelist?: unknown;
  blacklist?: unknown;
};

export type PreferenceAnalysis = {
  summary: string;
  category: "Phishing" | "Autre";
  intent: string;
  sentiment: "neutre" | "négatif";
  risk_score: number;
  risk_reason: string;
  entities: never[];
};

export function matchesSenderList(sender: string, entries: unknown): boolean {
  if (!Array.isArray(entries)) return false;
  const normalizedSender = sender.toLowerCase();
  return entries.some(
    (entry) =>
      typeof entry === "string" &&
      entry.trim().length > 0 &&
      normalizedSender.includes(entry.trim().toLowerCase()),
  );
}

export function getPreferenceList(settings: unknown, key: "whitelist" | "blacklist") {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return null;
  return (settings as PreferenceSettings)[key] ?? null;
}

export function buildPreferenceAnalysis(kind: "whitelist" | "blacklist"): PreferenceAnalysis {
  if (kind === "whitelist") {
    return {
      summary: "Expéditeur autorisé par vos préférences.",
      category: "Autre",
      intent: "Expéditeur autorisé",
      sentiment: "neutre",
      risk_score: 0,
      risk_reason: "Ce message correspond à votre liste blanche.",
      entities: [],
    };
  }

  return {
    summary: "Expéditeur bloqué par vos préférences.",
    category: "Phishing",
    intent: "Expéditeur bloqué",
    sentiment: "négatif",
    risk_score: 1,
    risk_reason: "Ce message correspond à votre liste noire.",
    entities: [],
  };
}

export function normalizeEmailAddress(value: string): string {
  return value.trim().toLowerCase();
}
