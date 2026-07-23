
ALTER TABLE public.email_accounts
  ADD COLUMN IF NOT EXISTS access_token text,
  ADD COLUMN IF NOT EXISTS refresh_token text,
  ADD COLUMN IF NOT EXISTS token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS scopes text,
  ADD COLUMN IF NOT EXISTS provider_account_id text,
  ADD COLUMN IF NOT EXISTS history_id text,
  ADD COLUMN IF NOT EXISTS error text;

CREATE UNIQUE INDEX IF NOT EXISTS email_accounts_user_provider_account_uidx
  ON public.email_accounts (user_id, provider, provider_account_id)
  WHERE provider_account_id IS NOT NULL;

ALTER TABLE public.emails
  ADD COLUMN IF NOT EXISTS provider_message_id text,
  ADD COLUMN IF NOT EXISTS thread_id text,
  ADD COLUMN IF NOT EXISTS snippet text;

CREATE UNIQUE INDEX IF NOT EXISTS emails_account_provider_msg_uidx
  ON public.emails (account_id, provider_message_id)
  WHERE provider_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS emails_user_received_idx
  ON public.emails (user_id, received_at DESC);
