-- M-4 hardening: per-IP rate limiter for unauthenticated edge functions
-- (donation-create / donation-status / donation-webhook).
--
-- Sliding-window-ish: count starts when the first request lands, resets when
-- the window expires. Stored as one row per (key, window_start). Service-role
-- only — never exposed to anon/authenticated.

CREATE TABLE IF NOT EXISTS public.rate_limits (
  key           text NOT NULL,
  window_start  timestamptz NOT NULL DEFAULT now(),
  count         int  NOT NULL DEFAULT 0,
  PRIMARY KEY (key)
);
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.rate_limits IS
  'Service-role only counter table for edge-function rate limiting (security audit M-4). '
  'Anon/auth never read or write here.';

DROP POLICY IF EXISTS rate_limits_explicit_deny ON public.rate_limits;
CREATE POLICY rate_limits_explicit_deny ON public.rate_limits
  FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key text,
  p_limit int,
  p_window_seconds int
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  cur public.rate_limits%ROWTYPE;
BEGIN
  INSERT INTO public.rate_limits (key, window_start, count)
  VALUES (p_key, now(), 1)
  ON CONFLICT (key) DO UPDATE
    SET window_start = CASE
          WHEN public.rate_limits.window_start < now() - make_interval(secs => p_window_seconds)
            THEN now()
          ELSE public.rate_limits.window_start
        END,
        count = CASE
          WHEN public.rate_limits.window_start < now() - make_interval(secs => p_window_seconds)
            THEN 1
          ELSE public.rate_limits.count + 1
        END
  RETURNING * INTO cur;

  RETURN cur.count <= p_limit;
END
$fn$;

REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, int, int) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.purge_stale_rate_limits(p_max_age_seconds int DEFAULT 3600)
RETURNS int
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
  WITH gone AS (
    DELETE FROM public.rate_limits
    WHERE window_start < now() - make_interval(secs => p_max_age_seconds)
    RETURNING 1
  )
  SELECT COUNT(*)::int FROM gone;
$fn$;
REVOKE EXECUTE ON FUNCTION public.purge_stale_rate_limits(int) FROM PUBLIC, anon, authenticated;
