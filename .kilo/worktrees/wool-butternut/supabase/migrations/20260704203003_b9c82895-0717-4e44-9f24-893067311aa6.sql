
ALTER TABLE public.emails REPLICA IDENTITY FULL;
ALTER TABLE public.email_accounts REPLICA IDENTITY FULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'emails'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.emails;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'email_accounts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.email_accounts;
  END IF;
END $$;
