import { z } from "zod";

export const CleanupSchema = z.object({
  days: z.number().int().min(1).max(365).default(5),
});

/** Date ISO de coupure pour la purge (reçus avant cette date). */
export function cleanupCutoffIso(days: number, nowMs = Date.now()): string {
  return new Date(nowMs - days * 86_400_000).toISOString();
}
