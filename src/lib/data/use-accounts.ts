import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "./auth-store";
import { accountsCache, dedupeDataRequest, subscribeToUserTable } from "./cache";
import type { DataResult, DbAccount } from "./types";

export interface AccountsResult extends DataResult {
  accounts: DbAccount[];
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

export function useAccounts(): AccountsResult {
  const { user, loading: userLoading, error: userError } = useUser();
  const userId = user?.id;
  const [accounts, setAccounts] = useState<DbAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setAccounts([]);
      setLoading(userLoading);
      setError(userError);
      return;
    }

    let cancelled = false;
    let requestId = 0;
    const cached = accountsCache.get(userId);
    if (cached) {
      setAccounts(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError(null);

    const load = async () => {
      const currentRequest = ++requestId;
      try {
        const nextAccounts = await dedupeDataRequest(`accounts:${userId}`, async () => {
          const { data, error: queryError } = await supabase
            .from("email_accounts")
            .select("id,provider,email,display_name,status,last_synced_at,created_at")
            .order("created_at", { ascending: false });
          if (queryError) throw queryError;
          return (data as DbAccount[]) ?? [];
        });
        if (cancelled || currentRequest !== requestId) return;
        accountsCache.set(userId, nextAccounts);
        setAccounts(nextAccounts);
        setError(null);
      } catch (loadError) {
        if (!cancelled && currentRequest === requestId) setError(asError(loadError));
      } finally {
        if (!cancelled && currentRequest === requestId) setLoading(false);
      }
    };

    void load();
    const unsubscribe = subscribeToUserTable("email_accounts", userId, () => void load());

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [userId, userLoading, userError]);

  return { accounts, loading, error };
}
