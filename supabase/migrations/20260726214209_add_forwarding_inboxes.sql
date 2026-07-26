-- Gmail forwarding alternative: each user receives a private MailMind address.
-- Resend delivers messages for that address to the inbound Edge Function.
ALTER TABLE public.email_accounts
  ADD COLUMN IF NOT EXISTS inbound_alias TEXT,
  ADD COLUMN IF NOT EXISTS forwarding_confirmation_code TEXT,
  ADD COLUMN IF NOT EXISTS forwarding_confirmation_url TEXT,
  ADD COLUMN IF NOT EXISTS last_forwarded_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS email_accounts_inbound_alias_uidx
  ON public.email_accounts (inbound_alias)
  WHERE inbound_alias IS NOT NULL;

ALTER TABLE public.email_accounts
  ADD CONSTRAINT email_accounts_inbound_alias_format_check
  CHECK (inbound_alias IS NULL OR inbound_alias ~ '^mm_[a-f0-9]{32}$');

-- The browser may read forwarding setup metadata for its own accounts only.
-- Existing RLS policies continue to enforce user_id = auth.uid().
GRANT SELECT (
  inbound_alias,
  forwarding_confirmation_code,
  forwarding_confirmation_url,
  last_forwarded_at
) ON public.email_accounts TO authenticated;

GRANT ALL ON public.email_accounts TO service_role;
