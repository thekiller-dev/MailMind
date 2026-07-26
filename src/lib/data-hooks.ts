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
};

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
    const load = () => {
      supabase
        .from("emails")
        .select("*")
        .is("archived_at", null)
        .order("received_at", { ascending: false })
        .limit(500)
        .then(({ data }) => {
          if (!cancelled) {
            setEmails((data as DbEmail[]) ?? []);
            setLoading(false);
          }
        });
    };
    load();
    const channel = supabase
      .channel(`emails:${userId}:${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "emails", filter: `user_id=eq.${userId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      cancelled = true;
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
    const load = () =>
      supabase
        .from("email_accounts")
        .select("id,provider,email,display_name,status,last_synced_at,created_at")
        .order("created_at", { ascending: false })
        .then(({ data }) => {
          if (!cancelled) {
            setAccounts((data as DbAccount[]) ?? []);
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
      .select("settings")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const stored = data?.settings;
        setSettings({
          ...DEFAULT_SETTINGS,
          ...(stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {}),
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
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  }

  return { settings, loading, updateSettings };
}
