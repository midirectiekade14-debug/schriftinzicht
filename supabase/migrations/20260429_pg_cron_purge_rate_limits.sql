-- Schedule daily cleanup of stale rate_limits rows.
-- Required because rate_limits grows linearly with unique IPs over time and
-- old rows are never read (window expires immediately on next request).

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Idempotent: if the job already exists, unschedule then reschedule.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge_stale_rate_limits_daily') THEN
    PERFORM cron.unschedule('purge_stale_rate_limits_daily');
  END IF;
END $$;

SELECT cron.schedule(
  'purge_stale_rate_limits_daily',
  '17 3 * * *',  -- 03:17 UTC daily (off-peak)
  $$ SELECT public.purge_stale_rate_limits(3600); $$
);
