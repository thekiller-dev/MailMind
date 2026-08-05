-- Free/Pro plans + durable analyzed counter + summary alerts + cleanup support.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'pro')),
  ADD COLUMN IF NOT EXISTS emails_analyzed_count integer NOT NULL DEFAULT 0
    CHECK (emails_analyzed_count >= 0);

UPDATE public.profiles SET plan = 'free' WHERE plan IS NULL;

ALTER TABLE public.telegram_connections
  ADD COLUMN IF NOT EXISTS summary_alerts boolean NOT NULL DEFAULT true;

ALTER TABLE public.whatsapp_connections
  ADD COLUMN IF NOT EXISTS summary_alerts boolean NOT NULL DEFAULT true;

GRANT SELECT (plan, emails_analyzed_count) ON public.profiles TO authenticated;

GRANT SELECT (summary_alerts) ON public.telegram_connections TO authenticated;
GRANT UPDATE (summary_alerts) ON public.telegram_connections TO authenticated;
GRANT SELECT (summary_alerts) ON public.whatsapp_connections TO authenticated;
GRANT UPDATE (summary_alerts) ON public.whatsapp_connections TO authenticated;

-- Seed analyzed count from current emails (best-effort backfill).
UPDATE public.profiles p
SET emails_analyzed_count = COALESCE(stats.analyzed_count, 0)
FROM (
  SELECT user_id, count(*)::integer AS analyzed_count
  FROM public.emails
  WHERE analyzed_at IS NOT NULL OR summary IS NOT NULL
  GROUP BY user_id
) AS stats
WHERE p.id = stats.user_id;

CREATE OR REPLACE FUNCTION public.increment_emails_analyzed_count(p_user_id uuid, p_delta integer DEFAULT 1)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF p_delta = 0 THEN
    RETURN;
  END IF;
  UPDATE public.profiles
  SET
    emails_analyzed_count = GREATEST(0, emails_analyzed_count + p_delta),
    updated_at = now()
  WHERE id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_emails_analyzed_count(uuid, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_emails_analyzed_count(uuid, integer)
  TO service_role;

CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'inbox_total', (
      SELECT count(*)::integer FROM public.emails
      WHERE user_id = p_user_id AND archived_at IS NULL
    ),
    'analyzed_total', (
      SELECT emails_analyzed_count FROM public.profiles WHERE id = p_user_id
    ),
    'urgent_total', (
      SELECT count(*)::integer FROM public.emails
      WHERE user_id = p_user_id
        AND archived_at IS NULL
        AND category = 'Urgent'
    ),
    'threats_total', (
      SELECT count(*)::integer FROM public.emails
      WHERE user_id = p_user_id
        AND archived_at IS NULL
        AND (
          category = 'Phishing'
          OR category = 'Sécurité'
          OR COALESCE(risk_score, 0) >= 0.7
        )
    ),
    'plan', (
      SELECT plan FROM public.profiles WHERE id = p_user_id
    )
  )
  INTO result;

  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.get_dashboard_stats(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(uuid)
  TO authenticated, service_role;
