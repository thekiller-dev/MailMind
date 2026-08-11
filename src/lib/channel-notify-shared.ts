export type EmailActionInput = {
  intent?: string | null;
  category: string | null;
};

/** Action courte affichée dans les récaps / alertes Telegram & WhatsApp. */
export function deriveEmailAction(email: EmailActionInput): string {
  if (email.intent?.trim()) return email.intent.trim();
  if (email.category === "Urgent") return "Traiter en priorité";
  if (email.category === "Phishing" || email.category === "Sécurité") {
    return "Vérifier avant toute action";
  }
  return "Consulter dans MailMind";
}

export function isSecurityAlert(email: {
  category: string | null;
  risk_score: number | null;
}): boolean {
  return (
    email.category === "Phishing" ||
    email.category === "Sécurité" ||
    (email.risk_score ?? 0) >= 0.6
  );
}

/** Structured skip logs — searchable in Vercel / Edge logs as `[channel-notify]`. */
export function logChannelNotifySkip(
  channel: "telegram" | "whatsapp" | "kappelas",
  reason: string,
  details: Record<string, unknown> = {},
): void {
  console.info(
    JSON.stringify({
      tag: "channel-notify",
      channel,
      skip: reason,
      ...details,
    }),
  );
}
