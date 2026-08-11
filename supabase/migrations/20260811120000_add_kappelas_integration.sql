-- Kappelas messaging channel — parité Telegram / WhatsApp
CREATE TABLE IF NOT EXISTS public.kappelas_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Kappelas numeric chat_id (private conversation with the bot)
  chat_id BIGINT UNIQUE,
  kappelas_user_id TEXT,
  username TEXT,
  display_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'linked', 'revoked')),
  link_token_hash TEXT UNIQUE,
  link_token_expires_at TIMESTAMPTZ,
  linked_at TIMESTAMPTZ,
  urgent_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  phishing_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  summary_alerts BOOLEAN NOT NULL DEFAULT TRUE,
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

CREATE INDEX IF NOT EXISTS kappelas_connections_pending_token_idx
  ON public.kappelas_connections (link_token_hash)
  WHERE link_token_hash IS NOT NULL;

ALTER TABLE public.kappelas_connections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.kappelas_connections FROM anon, authenticated;
GRANT SELECT (
  id,
  user_id,
  chat_id,
  kappelas_user_id,
  username,
  display_name,
  status,
  linked_at,
  urgent_alerts,
  phishing_alerts,
  summary_alerts,
  summary_digest,
  command_access,
  last_seen_at,
  created_at,
  updated_at
) ON public.kappelas_connections TO authenticated;
GRANT UPDATE (
  urgent_alerts,
  phishing_alerts,
  summary_alerts,
  summary_digest,
  command_access
) ON public.kappelas_connections TO authenticated;
GRANT ALL ON public.kappelas_connections TO service_role;

DROP POLICY IF EXISTS "own kappelas connection read" ON public.kappelas_connections;
CREATE POLICY "own kappelas connection read"
  ON public.kappelas_connections FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "own kappelas connection update" ON public.kappelas_connections;
CREATE POLICY "own kappelas connection update"
  ON public.kappelas_connections FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE TABLE IF NOT EXISTS public.kappelas_delivery_events (
  event_id TEXT PRIMARY KEY,
  chat_id BIGINT NOT NULL,
  event_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.kappelas_delivery_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.kappelas_delivery_events FROM anon, authenticated;
GRANT ALL ON public.kappelas_delivery_events TO service_role;

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS kappelas_digest_time TIME NOT NULL DEFAULT '08:00';

CREATE INDEX IF NOT EXISTS user_settings_kappelas_digest_schedule_idx
  ON public.user_settings (kappelas_digest_time, timezone);
