CREATE TABLE IF NOT EXISTS public.subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL DEFAULT 'standard'
    CHECK (plan_id IN ('standard', 'professional', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'past_due', 'cancelled', 'expired')),
  provider TEXT,
  provider_reference TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.subscriptions FROM anon, authenticated;
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
DROP POLICY IF EXISTS "own subscription read" ON public.subscriptions;
CREATE POLICY "own subscription read"
  ON public.subscriptions FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
CREATE TABLE IF NOT EXISTS public.billing_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'geniuspay',
  provider_reference TEXT UNIQUE,
  plan_id TEXT NOT NULL CHECK (plan_id IN ('professional')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'XOF' CHECK (currency = 'XOF'),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'expired')),
  checkout_url TEXT,
  customer_email TEXT,
  error TEXT,
  provider_payload JSONB,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS billing_payments_user_created_idx
  ON public.billing_payments (user_id, created_at DESC);
ALTER TABLE public.billing_payments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.billing_payments FROM anon, authenticated;
GRANT SELECT (
  id,
  user_id,
  provider,
  provider_reference,
  plan_id,
  amount,
  currency,
  status,
  checkout_url,
  paid_at,
  created_at,
  updated_at
) ON public.billing_payments TO authenticated;
GRANT ALL ON public.billing_payments TO service_role;
DROP POLICY IF EXISTS "own payments read" ON public.billing_payments;
CREATE POLICY "own payments read"
  ON public.billing_payments FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
CREATE TABLE IF NOT EXISTS public.billing_webhook_events (
  event_id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.billing_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.billing_webhook_events FROM anon, authenticated;
GRANT ALL ON public.billing_webhook_events TO service_role;
