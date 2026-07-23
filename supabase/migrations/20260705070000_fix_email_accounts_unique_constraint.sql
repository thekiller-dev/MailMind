-- The previous unique index was partial (WHERE provider_account_id IS NOT NULL),
-- which Postgres cannot use as an ON CONFLICT arbiter unless the predicate is
-- repeated verbatim in the upsert. Replace it with a plain (non-partial) unique
-- index: NULLs are still treated as distinct by Postgres, so this doesn't
-- reintroduce the "multiple nulls" problem the partial index was avoiding.
DROP INDEX IF EXISTS public.email_accounts_user_provider_account_uidx;

CREATE UNIQUE INDEX IF NOT EXISTS email_accounts_user_provider_account_uidx
  ON public.email_accounts (user_id, provider, provider_account_id);
