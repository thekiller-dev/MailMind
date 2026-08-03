import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "./auth-store";
import { dedupeDataRequest, subscribeToUserTable } from "./cache";
import type { DataResult, UserSettings } from "./types";

export const DEFAULT_SETTINGS: UserSettings = {
  phishingSensitivity: 80,
  urgencySensitivity: 65,
  noiseSensitivity: 45,
  autoSummarizeThreads: true,
  dailyDigest: true,
  aiReplies: false,
  whitelist: [],
  blacklist: [],
  pushNotifications: true,
  emailDigest: true,
  slackAlerts: false,
  quietStart: "22:00",
  quietEnd: "07:30",
  telegramDigestTime: "08:00",
  whatsappDigestTime: "08:00",
  timezone: "UTC",
};

export interface UserSettingsResult extends DataResult {
  settings: UserSettings;
  updateSettings: (patch: Partial<UserSettings>) => Promise<void>;
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

export function useUserSettings(): UserSettingsResult {
  const { user, loading: userLoading, error: userError } = useUser();
  const userId = user?.id;
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setSettings(DEFAULT_SETTINGS);
      setLoading(userLoading);
      setError(userError);
      return;
    }

    let cancelled = false;
    let requestId = 0;

    const load = async () => {
      const currentRequest = ++requestId;
      try {
        const data = await dedupeDataRequest(`settings:${userId}`, async () => {
          const { data: settingsData, error: queryError } = await supabase
            .from("user_settings")
            .select("settings,telegram_digest_time,whatsapp_digest_time,timezone")
            .eq("user_id", userId)
            .maybeSingle();
          if (queryError) throw queryError;
          return settingsData;
        });
        if (cancelled || currentRequest !== requestId) return;
        const stored = data?.settings;
        setSettings({
          ...DEFAULT_SETTINGS,
          ...(stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {}),
          telegramDigestTime:
            data?.telegram_digest_time?.slice(0, 5) ?? DEFAULT_SETTINGS.telegramDigestTime,
          whatsappDigestTime:
            data?.whatsapp_digest_time?.slice(0, 5) ?? DEFAULT_SETTINGS.whatsappDigestTime,
          timezone: data?.timezone ?? DEFAULT_SETTINGS.timezone,
        } as UserSettings);
        setError(null);
      } catch (loadError) {
        if (!cancelled && currentRequest === requestId) setError(asError(loadError));
      } finally {
        if (!cancelled && currentRequest === requestId) setLoading(false);
      }
    };

    setLoading(true);
    setError(null);
    void load();
    const unsubscribe = subscribeToUserTable("user_settings", userId, () => void load());

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [userId, userLoading, userError]);

  const updateSettings = useCallback(
    async (patch: Partial<UserSettings>) => {
      if (!userId) return;
      const previous = settings;
      const next = { ...settings, ...patch };
      setSettings(next);
      setError(null);
      const { error: updateError } = await supabase.from("user_settings").upsert({
        user_id: userId,
        settings: next,
        telegram_digest_time: next.telegramDigestTime,
        whatsapp_digest_time: next.whatsappDigestTime,
        timezone: next.timezone,
        updated_at: new Date().toISOString(),
      });
      if (updateError) {
        const nextError = asError(updateError);
        setSettings(previous);
        setError(nextError);
        throw nextError;
      }
    },
    [settings, userId],
  );

  return { settings, loading, error, updateSettings };
}
