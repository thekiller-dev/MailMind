import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { DbAccount, DbEmail } from "./types";

const CACHE_TTL = 30_000;
const REALTIME_DEBOUNCE = 500;

interface CacheEntry<T> {
  value: T;
  cachedAt: number;
}

const emailCache = new Map<string, CacheEntry<DbEmail[]>>();
const accountCache = new Map<string, CacheEntry<DbAccount[]>>();

function readCache<T>(cache: Map<string, CacheEntry<T>>, key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.cachedAt >= CACHE_TTL) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
}

export const emailsCache = {
  get: (userId: string) => readCache(emailCache, userId),
  set: (userId: string, emails: DbEmail[]) =>
    emailCache.set(userId, { value: emails, cachedAt: Date.now() }),
};

export const accountsCache = {
  get: (userId: string) => readCache(accountCache, userId),
  set: (userId: string, accounts: DbAccount[]) =>
    accountCache.set(userId, { value: accounts, cachedAt: Date.now() }),
};

type RealtimeTable = "emails" | "email_accounts" | "user_settings";

interface SharedChannel {
  channel: RealtimeChannel;
  listeners: Set<() => void>;
  timer: ReturnType<typeof setTimeout> | undefined;
}

const sharedChannels = new Map<string, SharedChannel>();
const requests = new Map<string, Promise<unknown>>();

export function dedupeDataRequest<T>(key: string, load: () => Promise<T>): Promise<T> {
  const current = requests.get(key) as Promise<T> | undefined;
  if (current) return current;
  const request = load().finally(() => {
    if (requests.get(key) === request) requests.delete(key);
  });
  requests.set(key, request);
  return request;
}

export function subscribeToUserTable(
  table: RealtimeTable,
  userId: string,
  listener: () => void,
): () => void {
  const key = `${table}:${userId}`;
  let shared = sharedChannels.get(key);

  if (!shared) {
    const listeners = new Set<() => void>();
    const entry: SharedChannel = {
      channel: undefined as unknown as RealtimeChannel,
      listeners,
      timer: undefined,
    };
    entry.channel = supabase
      .channel(`data:${table}:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `user_id=eq.${userId}` },
        () => {
          if (entry.timer) clearTimeout(entry.timer);
          entry.timer = setTimeout(() => {
            entry.timer = undefined;
            for (const callback of [...entry.listeners]) callback();
          }, REALTIME_DEBOUNCE);
        },
      )
      .subscribe();
    sharedChannels.set(key, entry);
    shared = entry;
  }

  shared.listeners.add(listener);

  return () => {
    const current = sharedChannels.get(key);
    if (!current) return;
    current.listeners.delete(listener);
    if (current.listeners.size > 0) return;
    if (current.timer) clearTimeout(current.timer);
    sharedChannels.delete(key);
    void supabase.removeChannel(current.channel);
  };
}
