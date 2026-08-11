-- Stripe billing: store customer/subscription refs on profiles; webhook idempotency.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_status text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_stripe_customer_id_uidx
  ON public.profiles (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_stripe_subscription_id_uidx
  ON public.profiles (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- Plan remains free|pro; only service_role may write billing columns / plan via admin client.
REVOKE UPDATE (plan, stripe_customer_id, stripe_subscription_id, stripe_subscription_status)
  ON public.profiles FROM authenticated;

GRANT SELECT (
  plan,
  emails_analyzed_count,
  stripe_subscription_status
) ON public.profiles TO authenticated;

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stripe_webhook_events FROM anon, authenticated;
GRANT ALL ON public.stripe_webhook_events TO service_role;
