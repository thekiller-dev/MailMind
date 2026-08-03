CREATE EXTENSION IF NOT EXISTS pgmq;

DO $$
BEGIN
  PERFORM pgmq.create('gmail_sync_jobs');
EXCEPTION
  WHEN duplicate_table OR unique_violation THEN NULL;
END;
$$;

CREATE TABLE public.sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.email_accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trigger text NOT NULL CHECK (trigger IN ('cron', 'manual', 'oauth', 'queue', 'history')),
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'success', 'partial', 'failed')),
  history_id_start text,
  history_id_end text,
  messages_listed integer NOT NULL DEFAULT 0 CHECK (messages_listed >= 0),
  messages_inserted integer NOT NULL DEFAULT 0 CHECK (messages_inserted >= 0),
  messages_analyzed integer NOT NULL DEFAULT 0 CHECK (messages_analyzed >= 0),
  error text,
  queue_message_id bigint,
  idempotency_key text NOT NULL UNIQUE,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX sync_runs_account_created_idx
  ON public.sync_runs (account_id, created_at DESC);
CREATE INDEX sync_runs_pending_idx
  ON public.sync_runs (status, created_at)
  WHERE status IN ('queued', 'running');

CREATE TABLE public.email_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_id uuid NOT NULL REFERENCES public.emails(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.email_accounts(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('archive', 'report', 'reply')),
  actor text NOT NULL DEFAULT 'user' CHECK (actor IN ('user', 'system', 'telegram')),
  result text NOT NULL CHECK (result IN ('success', 'failure')),
  error text,
  idempotency_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX email_actions_user_created_idx
  ON public.email_actions (user_id, created_at DESC);

CREATE TABLE public.usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL
    CHECK (event_type IN ('analysis', 'reply', 'sync', 'telegram_notify', 'export')),
  source text NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX usage_events_user_type_created_idx
  ON public.usage_events (user_id, event_type, created_at DESC);

ALTER TABLE public.sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.sync_runs, public.email_actions, public.usage_events
  FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.sync_runs, public.email_actions, public.usage_events
  TO service_role;
GRANT SELECT ON public.sync_runs, public.email_actions, public.usage_events
  TO authenticated;

CREATE POLICY "users read own sync runs"
  ON public.sync_runs FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "service role manages sync runs"
  ON public.sync_runs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "users read own email actions"
  ON public.email_actions FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "service role manages email actions"
  ON public.email_actions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "users read own usage events"
  ON public.usage_events FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "service role manages usage events"
  ON public.usage_events FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.consume_usage_quota(
  p_user_id uuid,
  p_event_type text,
  p_source text,
  p_daily_limit integer,
  p_minute_limit integer,
  p_quantity integer DEFAULT 1,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  daily_usage bigint;
  minute_usage bigint;
BEGIN
  IF p_daily_limit <= 0 OR p_minute_limit <= 0 OR p_quantity <= 0 THEN
    RETURN false;
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(p_user_id::text || ':' || p_event_type, 0)
  );

  SELECT COALESCE(sum(quantity), 0)
  INTO daily_usage
  FROM public.usage_events
  WHERE user_id = p_user_id
    AND event_type = p_event_type
    AND created_at >= now() - interval '24 hours';

  SELECT COALESCE(sum(quantity), 0)
  INTO minute_usage
  FROM public.usage_events
  WHERE user_id = p_user_id
    AND event_type = p_event_type
    AND created_at >= now() - interval '1 minute';

  IF daily_usage + p_quantity > p_daily_limit
    OR minute_usage + p_quantity > p_minute_limit THEN
    RETURN false;
  END IF;

  INSERT INTO public.usage_events (
    user_id, event_type, source, quantity, metadata
  )
  VALUES (
    p_user_id, p_event_type, p_source, p_quantity, p_metadata
  );

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_usage_quota(
  uuid, text, text, integer, integer, integer, jsonb
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_usage_quota(
  uuid, text, text, integer, integer, integer, jsonb
) TO service_role;

-- Expose only service-role Queue API operations through PostgREST.
CREATE SCHEMA IF NOT EXISTS pgmq_public;
REVOKE ALL ON SCHEMA pgmq_public FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA pgmq_public TO service_role;
GRANT USAGE ON SCHEMA pgmq TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgmq TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON pgmq.q_gmail_sync_jobs, pgmq.a_gmail_sync_jobs
  TO service_role;
ALTER TABLE pgmq.q_gmail_sync_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role manages gmail sync queue"
  ON pgmq.q_gmail_sync_jobs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION pgmq_public.send(
  queue_name text,
  message jsonb,
  sleep_seconds integer DEFAULT 0
)
RETURNS bigint
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT pgmq.send(queue_name, message, sleep_seconds);
$$;

CREATE OR REPLACE FUNCTION pgmq_public.read(
  queue_name text,
  sleep_seconds integer,
  n integer
)
RETURNS SETOF pgmq.message_record
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT * FROM pgmq.read(queue_name, sleep_seconds, n);
$$;

CREATE OR REPLACE FUNCTION pgmq_public.archive(
  queue_name text,
  message_id bigint
)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT pgmq.archive(queue_name, message_id);
$$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA pgmq_public
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgmq_public
  TO service_role;

-- Business data is server-owned; authenticated clients retain read access only.
REVOKE ALL ON public.emails FROM authenticated;
GRANT SELECT ON public.emails TO authenticated;
DROP POLICY IF EXISTS "own emails" ON public.emails;
CREATE POLICY "users read own emails"
  ON public.emails FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
