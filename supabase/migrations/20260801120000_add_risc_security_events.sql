-- Cross-Account Protection (RISC) event deduplication.
-- Service-role only; used solely for security / session management per RISC Terms.

CREATE TABLE IF NOT EXISTS public.risc_security_events (
  jti TEXT PRIMARY KEY,
  event_types TEXT[] NOT NULL DEFAULT '{}',
  subject_sub TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  handled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS risc_security_events_received_at_idx
  ON public.risc_security_events (received_at);

ALTER TABLE public.risc_security_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.risc_security_events FROM anon, authenticated;
GRANT ALL ON public.risc_security_events TO service_role;

-- Retention helper: delete events older than 30 days (call from cron or manually).
CREATE OR REPLACE FUNCTION public.purge_risc_security_events(retention_days integer DEFAULT 30)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.risc_security_events
  WHERE received_at < now() - make_interval(days => retention_days);
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_risc_security_events(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_risc_security_events(integer) TO service_role;
