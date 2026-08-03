-- WhatsApp (OpenWA remote gateway) — parité Telegram
CREATE TABLE IF NOT EXISTS public.whatsapp_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  -- OpenWA chatId / JID, e.g. 33612345678@c.us or …@s.whatsapp.net
  chat_id TEXT UNIQUE,
  phone TEXT,
  display_name TEXT,
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

CREATE INDEX IF NOT EXISTS whatsapp_connections_pending_token_idx
  ON public.whatsapp_connections (link_token_hash)
  WHERE link_token_hash IS NOT NULL;

ALTER TABLE public.whatsapp_connections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.whatsapp_connections FROM anon, authenticated;
GRANT SELECT (
  id,
  user_id,
  chat_id,
  phone,
  display_name,
  status,
  linked_at,
  urgent_alerts,
  phishing_alerts,
  summary_digest,
  command_access,
  last_seen_at,
  created_at,
  updated_at
) ON public.whatsapp_connections TO authenticated;
GRANT UPDATE (
  urgent_alerts,
  phishing_alerts,
  summary_digest,
  command_access
) ON public.whatsapp_connections TO authenticated;
GRANT ALL ON public.whatsapp_connections TO service_role;

DROP POLICY IF EXISTS "own whatsapp connection read" ON public.whatsapp_connections;
CREATE POLICY "own whatsapp connection read"
  ON public.whatsapp_connections FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "own whatsapp connection update" ON public.whatsapp_connections;
CREATE POLICY "own whatsapp connection update"
  ON public.whatsapp_connections FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE TABLE IF NOT EXISTS public.whatsapp_delivery_events (
  event_id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_delivery_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.whatsapp_delivery_events FROM anon, authenticated;
GRANT ALL ON public.whatsapp_delivery_events TO service_role;

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS whatsapp_digest_time TIME NOT NULL DEFAULT '08:00';

CREATE INDEX IF NOT EXISTS user_settings_whatsapp_digest_schedule_idx
  ON public.user_settings (whatsapp_digest_time, timezone);
