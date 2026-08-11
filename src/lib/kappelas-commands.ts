/** Pure helpers for Kappelas inbound text (unit-tested). */

export function extractKappelasLinkToken(text: string): string | null {
  const trimmed = text.trim();
  const start = /^\/start(?:@\w+)?(?:\s+|_)(.+)$/i.exec(trimmed);
  if (start?.[1]) return start[1].trim();
  const lien = /^(?:LIEN|LINK)\s+(\S+)/i.exec(trimmed);
  if (lien?.[1]) return lien[1].trim();
  return null;
}

export function resolveKappelasCommand(
  text: string,
): { command: string; argument?: string } | null {
  const match = /^\/([a-z]+)(?:@\w+)?(?:\s+([\s\S]+))?$/i.exec(text.trim());
  if (!match?.[1]) return null;
  return {
    command: `/${match[1].toLowerCase()}`,
    argument: match[2]?.trim() || undefined,
  };
}
