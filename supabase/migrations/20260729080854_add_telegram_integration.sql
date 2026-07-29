CREATE TABLE IF NOT EXISTS public.telegram_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_id BIGINT UNIQUE,
  username TEXT,
  first_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'linked', 'revoked')),
  link_token_hash TEXT UNIQUE,
  link_token_expires_at TIMESTAMPTZ,
  linked_at TIMESTAMPTZ,
  urgent_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  phishing_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  summary_digest BOOLEAN NOT NULL DEFAULT TRUE,
  command_access BOOLEAN NOT NULL DEFAULT TRUE,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (status = 'linked' AND chat_id IS NOT NULL AND linked_at IS NOT NULL)
    OR status IN ('pending', 'revoked')
  )
);

CREATE INDEX IF NOT EXISTS telegram_connections_pending_token_idx
  ON public.telegram_connections (link_token_hash)
  WHERE link_token_hash IS NOT NULL;

ALTER TABLE public.telegram_connections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.telegram_connections FROM anon, authenticated;
GRANT SELECT, UPDATE ON public.telegram_connections TO authenticated;
GRANT ALL ON public.telegram_connections TO service_role;

DROP POLICY IF EXISTS "own telegram connection read" ON public.telegram_connections;
CREATE POLICY "own telegram connection read"
  ON public.telegram_connections FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "own telegram connection update" ON public.telegram_connections;
CREATE POLICY "own telegram connection update"
  ON public.telegram_connections FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE TABLE IF NOT EXISTS public.telegram_delivery_events (
  event_id TEXT PRIMARY KEY,
  chat_id BIGINT NOT NULL,
  event_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.telegram_delivery_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.telegram_delivery_events FROM anon, authenticated;
GRANT ALL ON public.telegram_delivery_events TO service_role;
