-- OAuth tokens are server-only secrets. The browser only needs the public account fields.
REVOKE SELECT (access_token, refresh_token, token_expires_at, scopes) ON public.email_accounts FROM authenticated;
REVOKE INSERT (access_token, refresh_token, token_expires_at, scopes) ON public.email_accounts FROM authenticated;
REVOKE UPDATE (access_token, refresh_token, token_expires_at, scopes) ON public.email_accounts FROM authenticated;

ALTER TABLE public.emails
  ADD CONSTRAINT emails_risk_score_range_check
  CHECK (risk_score IS NULL OR (risk_score >= 0 AND risk_score <= 1));

ALTER TABLE public.emails
  ADD CONSTRAINT emails_received_at_not_future_check
  CHECK (received_at <= now() + interval '10 minutes');
