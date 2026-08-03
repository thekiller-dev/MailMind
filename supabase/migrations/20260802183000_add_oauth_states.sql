CREATE TABLE public.oauth_states (
  nonce_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  origin text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT oauth_states_origin_check CHECK (origin ~ '^https?://[^/]+$')
);

CREATE INDEX oauth_states_user_expires_idx
  ON public.oauth_states (user_id, expires_at DESC);

ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.oauth_states FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.oauth_states TO service_role;

CREATE POLICY "service role manages oauth states"
  ON public.oauth_states
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.consume_oauth_state(
  p_nonce_hash text,
  p_origin text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  consumed_user_id uuid;
BEGIN
  UPDATE public.oauth_states
  SET consumed_at = now()
  WHERE nonce_hash = p_nonce_hash
    AND origin = p_origin
    AND consumed_at IS NULL
    AND expires_at > now()
  RETURNING user_id INTO consumed_user_id;

  RETURN consumed_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_oauth_state(text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_oauth_state(text, text)
  TO service_role;

-- Ensure the existing retention helper is not callable through the public API.
REVOKE ALL ON FUNCTION public.purge_risc_security_events(integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_risc_security_events(integer)
  TO service_role;

CREATE POLICY "service role manages risc events"
  ON public.risc_security_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service role manages telegram delivery events"
  ON public.telegram_delivery_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
