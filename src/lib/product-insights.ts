/**
 * Helpers purs pour digests / silence intelligent (réutilisés côté analyse et canaux).
 */

export type EngagementKind =
  | "none"
  | "meeting"
  | "invoice"
  | "followup"
  | "signature"
  | "deadline"
  | "other";

export function isNoiseCategory(category: string | null | undefined): boolean {
  return category === "Notification" || category === "Commercial" || category === "Autre";
}

export function shouldSilenceRecap(input: {
  smartSilence: boolean;
  category: string | null | undefined;
  riskScore: number | null | undefined;
  engagement?: EngagementKind | null;
}): boolean {
  if (!input.smartSilence) return false;
  const risk = input.riskScore ?? 0;
  if (risk >= 0.6) return false;
  if (input.category === "Urgent" || input.category === "Phishing" || input.category === "Sécurité") {
    return false;
  }
  if (input.engagement && input.engagement !== "none") return false;
  return isNoiseCategory(input.category);
}

export function estimateMinutesSaved(analyzedCount: number): number {
  // ~1.2 min / mail analysé (hypothèse produit affichée au dashboard).
  return Math.round(Math.max(0, analyzedCount) * 1.2);
}

export function formatDigest60Seconds(input: {
  emails: Array<{
    subject: string | null;
    summary: string | null;
    category: string | null;
    risk_score: number | null;
    engagement?: string | null;
  }>;
  analyzedCount: number;
  markup: "html" | "md";
}): string {
  const bold = (value: string) => (input.markup === "html" ? `<b>${value}</b>` : `*${value}*`);
  const escape =
    input.markup === "html"
      ? (value: string) =>
          value
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
      : (value: string) => value;

  const urgent = input.emails.filter((e) => e.category === "Urgent").length;
  const threats = input.emails.filter(
    (e) =>
      e.category === "Phishing" ||
      e.category === "Sécurité" ||
      Number(e.risk_score ?? 0) >= 0.6,
  ).length;
  const engagements = input.emails.filter(
    (e) => e.engagement && e.engagement !== "none",
  ).length;
  const minutes = estimateMinutesSaved(input.analyzedCount);
  const hours = (minutes / 60).toFixed(1);

  const top = input.emails.slice(0, 5).map((email, index) => {
    const flag =
      Number(email.risk_score ?? 0) >= 0.6 || email.category === "Phishing"
        ? " ⚠️"
        : email.category === "Urgent"
          ? " ⚡"
          : "";
    const line = `${index + 1}. ${escape(email.subject || "(sans objet)")}${flag}`;
    const summary = email.summary ? `\n   ${escape(email.summary.slice(0, 120))}` : "";
    return `${line}${summary}`;
  });

  return [
    bold("Digest du jour — 60 secondes"),
    `${input.emails.length} mails aujourd’hui · ${urgent} urgents · ${threats} menaces · ${engagements} engagements`,
    `Temps gagné estimé : ~${hours} h (${minutes} min)`,
    "",
    ...top,
    "",
    "Commandes : /archive <id> · /draft <id> · /snooze <id> · /share <id>",
  ].join("\n");
}

export function formatSecurityShare(input: {
  subject: string | null;
  sender: string | null;
  summary: string | null;
  riskScore: number | null;
  riskReason: string | null;
  appOrigin?: string;
}): string {
  const riskPct = Math.round((input.riskScore ?? 0) * 100);
  return [
    "⚠️ Alerte sécurité MailMind",
    `Sujet : ${input.subject || "(sans objet)"}`,
    `Expéditeur : ${input.sender || "inconnu"}`,
    input.summary || "",
    `Risque : ${riskPct}%${input.riskReason ? ` — ${input.riskReason}` : ""}`,
    "Conseil : ne clique aucun lien et ne partage aucun code.",
    input.appOrigin ? `Détails : ${input.appOrigin}/inbox` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function shortEmailRef(emailId: string): string {
  return emailId.replace(/-/g, "").slice(0, 8);
}
