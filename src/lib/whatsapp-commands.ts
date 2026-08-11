/**
 * Helpers purs pour le webhook WhatsApp / OpenWA (testables sans env).
 */

/** WhatsApp / clients mobiles injectent parfois des ZWSP / BOM autour du texte collé. */
export function sanitizeWhatsAppText(text: string): string {
  return text
    .replace(/[\u200B-\u200D\uFEFF\u2060]/g, "")
    .replace(/\r\n/g, "\n")
    .trim();
}

export function resolveWhatsAppCommand(text: string): string {
  const cleaned = sanitizeWhatsAppText(text);
  const firstWord = cleaned.split(/\s+/, 1)[0]?.toLowerCase().split("@", 1)[0] ?? "";
  if (firstWord.startsWith("/")) {
    const aliases: Record<string, string> = {
      "/aide": "/help",
      "/connexion": "/status",
      "/derniers": "/recents",
      "/resumes": "/recents",
      "/résumés": "/recents",
      "/urgences": "/urgent",
      "/suspects": "/alerts",
      "/deconnecter": "/unlink",
      "/déconnecter": "/unlink",
      "/lien": "/start",
      "/archiver": "/archive",
      "/brouillon": "/draft",
      "/repondre": "/draft",
      "/répondre": "/draft",
      "/plus_tard": "/snooze",
      "/plus-tard": "/snooze",
      "/partager": "/share",
    };
    return aliases[firstWord] ?? firstWord;
  }

  const normalized = cleaned
    .toLocaleLowerCase("fr-FR")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

  // Liaison : "LIEN <token>" ou "START <token>"
  if (/^(lien|start)\s+\S+/i.test(cleaned)) return "/start";

  // Actions sur un mail précis avant les intentions génériques : « archive ab12cd34 »
  // contient « archive » ET pourrait matcher /recents via « mails ».
  if (/\b(archive|archiver)\b/.test(normalized)) return "/archive";
  if (/\b(brouillon|draft|repond(re|s)?)\b/.test(normalized)) return "/draft";
  if (/\b(snooze|plus.?tard)\b/.test(normalized)) return "/snooze";
  if (/\b(partager|share)\b/.test(normalized)) return "/share";
  if (/\bdigest\b/.test(normalized)) return "/digest";
  if (/\b(dernier|recents?|resume|mails?|messages?)\b/.test(normalized)) return "/recents";
  if (/\b(urgence|urgent|immediat)\b/.test(normalized)) return "/urgent";
  if (/\b(phishing|suspect|arnaque|fraude|dangereux)\b/.test(normalized)) return "/alerts";
  if (/\b(alerte|alertes|risque|securite)\b/.test(normalized)) return "/alerts";
  if (/\b(aide|help|commande|commandes)\b/.test(normalized)) return "/help";
  if (/^(bonjour|salut|hello|bonsoir)\b/.test(normalized)) return "/welcome";
  return "";
}

export function extractLinkToken(text: string): string | null {
  const trimmed = sanitizeWhatsAppText(text);
  const match = /^(?:\/(?:start|lien)|lien|start)\s+(\S+)/i.exec(trimmed) ?? null;
  return match?.[1] ?? null;
}

/**
 * Argument d’une commande action : `/archive ab12cd34` → `ab12cd34`,
 * ou l’id court repéré dans une phrase (« archive ab12cd34 »).
 */
export function extractCommandArgument(text: string): string | undefined {
  const cleaned = sanitizeWhatsAppText(text);
  const firstWord = cleaned.split(/\s+/, 1)[0] ?? "";
  if (firstWord.startsWith("/")) {
    return cleaned.slice(firstWord.length).trim().split(/\s+/, 1)[0] || undefined;
  }
  return /\b([0-9a-f]{8})\b/i.exec(cleaned)?.[1];
}

export async function hashLinkToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
