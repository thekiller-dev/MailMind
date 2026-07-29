REVOKE ALL ON public.telegram_connections FROM anon, authenticated;
GRANT SELECT (
  id,
  user_id,
  chat_id,
  username,
  first_name,
  status,
  linked_at,
  urgent_alerts,
  phishing_alerts,
  summary_digest,
  command_access,
  last_seen_at,
  created_at,
  updated_at
) ON public.telegram_connections TO authenticated;
GRANT UPDATE (
  urgent_alerts,
  phishing_alerts,
  summary_digest,
  command_access
) ON public.telegram_connections TO authenticated;
