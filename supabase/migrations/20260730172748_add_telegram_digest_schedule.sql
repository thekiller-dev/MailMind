ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS telegram_digest_time TIME NOT NULL DEFAULT '08:00',
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC';

ALTER TABLE public.user_settings
  DROP CONSTRAINT IF EXISTS user_settings_timezone_not_empty;

ALTER TABLE public.user_settings
  ADD CONSTRAINT user_settings_timezone_not_empty
  CHECK (length(trim(timezone)) > 0);

CREATE INDEX IF NOT EXISTS user_settings_telegram_digest_schedule_idx
  ON public.user_settings (telegram_digest_time, timezone);
