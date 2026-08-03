import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { dedupeDataRequest, emailsCache, subscribeToUserTable } from "./cache";
import { useUser } from "./auth-store";
import type { DataResult, DbEmail } from "./types";

const EMAIL_SELECT =
  "id,sender,subject,body,snippet,category,intent,sentiment,risk_score,summary,entities,received_at,account_id,provider_message_id,analyzed_at,archived_at,reported_at,risk_reason";

export interface EmailsResult extends DataResult {
  emails: DbEmail[];
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

export function useEmails(): EmailsResult {
  const { user, loading: userLoading, error: userError } = useUser();
  const userId = user?.id;
  const [emails, setEmails] = useState<DbEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setEmails([]);
      setLoading(userLoading);
      setError(userError);
      return;
    }

    let cancelled = false;
    let requestId = 0;
    const cached = emailsCache.get(userId);
    if (cached) {
      setEmails(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError(null);

    const load = async () => {
      const currentRequest = ++requestId;
      try {
        const nextEmails = await dedupeDataRequest(`emails:${userId}`, async () => {
          const { data, error: queryError } = await supabase
            .from("emails")
            .select(EMAIL_SELECT)
            .is("archived_at", null)
            .order("received_at", { ascending: false })
            .limit(200);
          if (queryError) throw queryError;
          return (data as DbEmail[]) ?? [];
        });
        if (cancelled || currentRequest !== requestId) return;
        emailsCache.set(userId, nextEmails);
        setEmails(nextEmails);
        setError(null);
      } catch (loadError) {
        if (!cancelled && currentRequest === requestId) setError(asError(loadError));
      } finally {
        if (!cancelled && currentRequest === requestId) setLoading(false);
      }
    };

    void load();
    const unsubscribe = subscribeToUserTable("emails", userId, () => void load());

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [userId, userLoading, userError]);

  return { emails, loading, error };
}
