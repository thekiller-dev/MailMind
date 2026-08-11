/**
 * Planification des digests journaliers TG/WA.
 *
 * Sur Vercel Hobby le cron ne peut tourner qu’1×/jour (voir vercel.json :
 * `0 17 * * *` UTC). On utilise donc un catch-up : si l’heure locale
 * configurée (ex. 18:00 Europe/Paris) est déjà passée aujourd’hui et
 * qu’aucun digest n’a encore été envoyé pour cette date locale, on envoie.
 * À 17:00 UTC, Paris CEST = 19:00 (18h passée) et Paris CET = 18:00 exact.
 */

export function getLocalDateTime(timeZone: string, date = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return {
      date: `${values.year}-${values.month}-${values.day}`,
      minutes: Number(values.hour) * 60 + Number(values.minute),
      seconds: Number(values.second ?? 0),
    };
  } catch {
    return getLocalDateTime("UTC", date);
  }
}

/** Normalise "18:00:00" → "18:00". */
export function normalizeDigestTime(value: string | null | undefined, fallback = "18:00"): string {
  const raw = (value ?? fallback).trim();
  const match = /^(\d{1,2}):(\d{2})/.exec(raw);
  if (!match) return fallback;
  const hours = Math.min(23, Math.max(0, Number(match[1])));
  const minutes = Math.min(59, Math.max(0, Number(match[2])));
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/**
 * Fenêtre ±14 min autour de l’heure configurée (fuseau utilisateur).
 * Utile pour un cron fréquent ; préfère `isDigestDueOrCatchUp` sur Hobby.
 */
export function isDigestDue(
  configuredTime: string,
  timeZone: string,
  now = new Date(),
  windowMinutes = 14,
): string | null {
  const normalized = normalizeDigestTime(configuredTime);
  const [hours, minutes] = normalized.split(":").map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  const local = getLocalDateTime(timeZone, now);
  const target = hours * 60 + minutes;
  const difference = Math.abs(local.minutes - target);
  const circularDifference = Math.min(difference, 1_440 - difference);
  if (circularDifference > windowMinutes) return null;
  return local.date;
}

/**
 * Catch-up pour cron quotidien : l’heure locale configurée est déjà
 * passée (ou exacte) aujourd’hui → retourne la date locale, sinon null.
 */
export function isDigestDueOrCatchUp(
  configuredTime: string,
  timeZone: string,
  now = new Date(),
): string | null {
  const normalized = normalizeDigestTime(configuredTime);
  const [hours, minutes] = normalized.split(":").map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  const local = getLocalDateTime(timeZone, now);
  const target = hours * 60 + minutes;
  if (local.minutes < target) return null;
  return local.date;
}

/** Début du jour local (approx. DST-safe pour digests). */
export function startOfLocalDay(timeZone: string, now = new Date()): Date {
  const local = getLocalDateTime(timeZone, now);
  const msFromMidnight = (local.minutes * 60 + local.seconds) * 1000;
  return new Date(now.getTime() - msFromMidnight);
}

export function digestEventId(
  channel: "telegram" | "whatsapp" | "kappelas",
  localDate: string,
  userId: string,
) {
  return `digest:${channel}:${localDate}:${userId}`;
}
