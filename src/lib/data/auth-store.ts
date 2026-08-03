import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AuthChangeEvent, Session, Subscription, User } from "@supabase/supabase-js";
import type { UserResult } from "./types";

interface AuthSnapshot {
  user: User | null;
  loading: boolean;
  error: Error | null;
}

let snapshot: AuthSnapshot = { user: null, loading: true, error: null };
let authSubscription: Subscription | undefined;
let requestGeneration = 0;
const subscribers = new Set<(next: AuthSnapshot) => void>();

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function publish(next: AuthSnapshot) {
  snapshot = next;
  for (const subscriber of [...subscribers]) subscriber(snapshot);
}

function startAuthStore() {
  if (authSubscription) return;
  const generation = ++requestGeneration;

  void supabase.auth.getUser().then(({ data, error }) => {
    if (generation !== requestGeneration) return;
    publish({
      user: data.user ?? null,
      loading: false,
      error: error ? asError(error) : null,
    });
  });

  const result = supabase.auth.onAuthStateChange(
    (_event: AuthChangeEvent, session: Session | null) => {
      publish({ user: session?.user ?? null, loading: false, error: null });
    },
  );
  authSubscription = result.data.subscription;
}

function subscribe(subscriber: (next: AuthSnapshot) => void): () => void {
  subscribers.add(subscriber);
  startAuthStore();
  subscriber(snapshot);

  return () => {
    subscribers.delete(subscriber);
    if (subscribers.size > 0) return;
    requestGeneration += 1;
    authSubscription?.unsubscribe();
    authSubscription = undefined;
  };
}

export function useUser(): UserResult {
  const [state, setState] = useState(snapshot);

  useEffect(() => subscribe(setState), []);

  return state;
}
