export interface AnalysisSettings {
  phishingSensitivity?: unknown;
  urgencySensitivity?: unknown;
  noiseSensitivity?: unknown;
  aiReplies?: unknown;
  quietStart?: unknown;
  quietEnd?: unknown;
  timezone?: unknown;
}

interface AdjustableAnalysis {
  category: string;
  risk_score: number;
  risk_reason: string;
}

function slider(value: unknown, fallback = 50): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(Math.max(value, 0), 100)
    : fallback;
}

export function getAnalysisInstruction(settings: unknown): string {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return "";
  const value = settings as AnalysisSettings;
  return [
    `Sensibilité phishing: ${slider(value.phishingSensitivity, 80)}/100.`,
    `Sensibilité urgence: ${slider(value.urgencySensitivity, 65)}/100.`,
    `Tolérance au bruit/newsletters: ${slider(value.noiseSensitivity, 45)}/100.`,
    "Utilise ces préférences comme pondération, sans inventer de menace ni d'urgence.",
  ].join(" ");
}

export function applyAnalysisSettings<T extends AdjustableAnalysis>(
  analysis: T,
  settings: unknown,
): T {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return analysis;
  const value = settings as AnalysisSettings;
  const sensitivity = slider(value.phishingSensitivity, 80);
  const adjustment = (sensitivity - 50) / 250;
  const riskScore = Math.min(Math.max(analysis.risk_score + adjustment, 0), 1);

  return {
    ...analysis,
    risk_score: Number(riskScore.toFixed(3)),
    risk_reason:
      adjustment === 0
        ? analysis.risk_reason
        : `${analysis.risk_reason} Score ajusté selon votre sensibilité phishing.`,
  };
}

export function areAiRepliesEnabled(settings: unknown): boolean {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return false;
  return (settings as AnalysisSettings).aiReplies === true;
}

export function isWithinQuietHours(
  settings: unknown,
  now = new Date(),
  defaultTimeZone = "UTC",
): boolean {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return false;
  const value = settings as AnalysisSettings;
  if (typeof value.quietStart !== "string" || typeof value.quietEnd !== "string") return false;

  const parse = (time: string) => {
    const match = /^(\d{2}):(\d{2})$/.exec(time);
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) return null;
    return hours * 60 + minutes;
  };
  const start = parse(value.quietStart);
  const end = parse(value.quietEnd);
  if (start === null || end === null || start === end) return false;

  let current: number;
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: typeof value.timezone === "string" ? value.timezone : defaultTimeZone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
    const part = Object.fromEntries(parts.map((item) => [item.type, item.value]));
    current = Number(part.hour) * 60 + Number(part.minute);
  } catch {
    return isWithinQuietHours({ ...value, timezone: "UTC" }, now, "UTC");
  }

  return start < end ? current >= start && current < end : current >= start || current < end;
}
