-- Tokens are server-only. The client only needs the safe account projection.
REVOKE ALL ON public.email_accounts FROM anon, authenticated;
GRANT SELECT (
  id,
  user_id,
  provider,
  email,
  display_name,
  status,
  last_synced_at,
  created_at
) ON public.email_accounts TO authenticated;

-- All writes go through authenticated server functions using service_role.
-- RLS remains enabled as a second isolation layer.
