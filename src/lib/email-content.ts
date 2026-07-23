const HTML_ENTITY_MAP: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
};

function decodeEntities(value: string): string {
  return value
    .replace(/&#x([\da-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&([a-z]+);/gi, (match, name: string) => HTML_ENTITY_MAP[name.toLowerCase()] ?? match);
}

export function htmlToText(value: string): string {
  return decodeEntities(
    value
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<(script|style|head|svg)[^>]*>[\s\S]*?<\/\1>/gi, "")
      .replace(/<li\b[^>]*>/gi, "\n• ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|tr|h[1-6]|section|table|blockquote)>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\r/g, "")
      .replace(/[ \t]+/g, " ")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  );
}

export function readableEmailBody(value: string | null | undefined): string {
  if (!value) return "";
  return /<(?:!doctype|html|body|table|div|p|style|br)\b/i.test(value) ? htmlToText(value) : value;
}
