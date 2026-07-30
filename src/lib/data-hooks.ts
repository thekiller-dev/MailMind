import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export interface DbEmail {
  id: string;
  sender: string;
  subject: string;
  body: string | null;
  snippet: string | null;
  category: string | null;
  intent: string | null;
  sentiment: string | null;
  risk_score: number | null;
  summary: string | null;
  entities: unknown;
  received_at: string;
  account_id: string | null;
  provider_message_id: string | null;
  analyzed_at: string | null;
  archived_at: string | null;
  reported_at: string | null;
  risk_reason: string | null;
}

export interface DbAccount {
  id: string;
  provider: string;
  email: string;
  display_name: string | null;
  status: string;
  last_synced_at: string | null;
}

export interface UserSettings {
  phishingSensitivity: number;
  urgencySensitivity: number;
  noiseSensitivity: number;
  autoSummarizeThreads: boolean;
  dailyDigest: boolean;
  aiReplies: boolean;
  whitelist: string[];
  blacklist: string[];
  pushNotifications: boolean;
  emailDigest: boolean;
  slackAlerts: boolean;
  quietStart: string;
  quietEnd: string;
  telegramDigestTime: string;
  timezone: string;
}

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
  timezone: "UTC",
};

const EMAIL_SELECT =
  "id,sender,subject,body,snippet,category,intent,sentiment,risk_score,summary,entities,received_at,account_id,provider_message_id,analyzed_at,archived_at,reported_at,risk_reason";
const EMAIL_CACHE_TTL = 30_000;
const emailCache = new Map<string, { emails: DbEmail[]; cachedAt: number }>();
const accountCache = new Map<string, { accounts: DbAccount[]; cachedAt: number }>();

// Shared auth store: a single getUser() call and a single onAuthStateChange
// listener are fanned out to every useUser() consumer, instead of each hook
// instance (~5 per page) opening its own subscription.
let cachedUser: User | null = null;
let userLoaded = false;
let authListenerStarted = false;
const userSubscribers = new Set<(u: User | null) => void>();

function notifyUserSubscribers() {
  userLoaded = true;
  for (const cb of userSubscribers) cb(cachedUser);
}

function ensureAuthListener() {
  if (authListenerStarted) return;
  authListenerStarted = true;
  supabase.auth.getUser().then(({ data }) => {
    cachedUser = data.user;
    notifyUserSubscribers();
  });
  supabase.auth.onAuthStateChange((_e, session) => {
    cachedUser = session?.user ?? null;
    notifyUserSubscribers();
  });
}

export function useUser() {
  const [user, setUser] = useState<User | null>(cachedUser);
  const [loading, setLoading] = useState(!userLoaded);
  useEffect(() => {
    ensureAuthListener();
    const cb = (u: User | null) => {
      setUser(u);
      setLoading(false);
    };
    userSubscribers.add(cb);
    if (userLoaded) cb(cachedUser);
    return () => {
      userSubscribers.delete(cb);
    };
  }, []);
  return { user, loading };
}

export function useEmails() {
  const { user } = useUser();
  const userId = user?.id;
  const [emails, setEmails] = useState<DbEmail[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!userId) {
      setEmails([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const cached = emailCache.get(userId);
    if (cached && Date.now() - cached.cachedAt < EMAIL_CACHE_TTL) {
      setEmails(cached.emails);
      setLoading(false);
    }

    const load = () => {
      supabase
        .from("emails")
        .select(EMAIL_SELECT)
        .is("archived_at", null)
        .order("received_at", { ascending: false })
        .limit(200)
        .then(({ data }) => {
          if (!cancelled) {
            const nextEmails = (data as DbEmail[]) ?? [];
            emailCache.set(userId, { emails: nextEmails, cachedAt: Date.now() });
            setEmails(nextEmails);
            setLoading(false);
          }
        });
    };
    load();
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const channel = supabase
      .channel(`emails:${userId}:${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "emails", filter: `user_id=eq.${userId}` },
        () => {
          if (refreshTimer) clearTimeout(refreshTimer);
          refreshTimer = setTimeout(load, 500);
        },
      )
      .subscribe();
    return () => {
      cancelled = true;
      if (refreshTimer) clearTimeout(refreshTimer);
      supabase.removeChannel(channel);
    };
  }, [userId]);
  return { emails, loading };
}

export function useAccounts() {
  const { user } = useUser();
  const userId = user?.id;
  const [accounts, setAccounts] = useState<DbAccount[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!userId) {
      setAccounts([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const cached = accountCache.get(userId);
    if (cached && Date.now() - cached.cachedAt < EMAIL_CACHE_TTL) {
      setAccounts(cached.accounts);
      setLoading(false);
    }
    const load = () =>
      supabase
        .from("email_accounts")
        .select("id,provider,email,display_name,status,last_synced_at,created_at")
        .order("created_at", { ascending: false })
        .then(({ data }) => {
          if (!cancelled) {
            const nextAccounts = (data as DbAccount[]) ?? [];
            accountCache.set(userId, { accounts: nextAccounts, cachedAt: Date.now() });
            setAccounts(nextAccounts);
            setLoading(false);
          }
        });
    load();
    const channel = supabase
      .channel(`accounts:${userId}:${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "email_accounts", filter: `user_id=eq.${userId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId]);
  return { accounts, loading };
}

export function useUserSettings() {
  const { user } = useUser();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setSettings(DEFAULT_SETTINGS);
      setLoading(false);
      return;
    }
    let cancelled = false;
    supabase
      .from("user_settings")
      .select("settings,telegram_digest_time,timezone")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const stored = data?.settings;
        setSettings({
          ...DEFAULT_SETTINGS,
          ...(stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {}),
          telegramDigestTime:
            data?.telegram_digest_time?.slice(0, 5) ?? DEFAULT_SETTINGS.telegramDigestTime,
          timezone: data?.timezone ?? DEFAULT_SETTINGS.timezone,
        } as UserSettings);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  async function updateSettings(patch: Partial<UserSettings>) {
    if (!user?.id) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    const { error } = await supabase.from("user_settings").upsert({
      user_id: user.id,
      settings: next,
      telegram_digest_time: next.telegramDigestTime,
      timezone: next.timezone,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  }

  return { settings, loading, updateSettings };
}
