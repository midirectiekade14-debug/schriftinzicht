-- SchriftInzicht — RLS hardening + premium_until beveiliging
-- Datum: 2026-04-22
-- Doel:
--   1. Voorkomen dat users hun eigen premium_until / mollie_customer_id kunnen zetten.
--   2. Write-policies op content-tabellen beperkt tot admin-UUID.
--   3. Commentaries unique constraint tegen dubbele imports.
--
-- Voer uit in Supabase SQL Editor.

-- ──────────────────────────────────────────────────────────────────
-- 1. Bescherm premium_until en mollie_customer_id tegen user-mutatie
-- ──────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.protect_premium_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- Service role bypasset RLS en draait niet via deze trigger-context.
  -- Bij UPDATE door een geauthenticeerde user (auth.uid() = NEW.id):
  -- premium_until en mollie_customer_id mogen NIET wijzigen.
  IF auth.uid() IS NOT NULL AND auth.uid() = NEW.id THEN
    IF NEW.premium_until IS DISTINCT FROM OLD.premium_until THEN
      NEW.premium_until := OLD.premium_until;
    END IF;
    IF NEW.mollie_customer_id IS DISTINCT FROM OLD.mollie_customer_id THEN
      NEW.mollie_customer_id := OLD.mollie_customer_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_protect_premium_columns ON public.user_profiles;
CREATE TRIGGER trg_protect_premium_columns
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_premium_columns();

-- ──────────────────────────────────────────────────────────────────
-- 2. is_admin() helper
-- ──────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT auth.uid() = '7e2ac885-0cdf-42a4-9f10-ca84bf1d889e'::uuid;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- ──────────────────────────────────────────────────────────────────
-- 3. Write-policies op content-tabellen (alleen admin muteert)
--    Publiek SELECT blijft open; INSERT/UPDATE/DELETE → admin only.
-- ──────────────────────────────────────────────────────────────────

DO $$
DECLARE
  tbl text;
  content_tables text[] := ARRAY[
    'bible_verses',
    'bible_books',
    'kanttekeningen',
    'commentaries',
    'sermons',
    'authors',
    'source_works',
    'catechism_questions',
    'confession_articles',
    'confession_proof_texts',
    'cross_references'
  ];
BEGIN
  FOREACH tbl IN ARRAY content_tables LOOP
    -- Skip tabel als hij niet bestaat
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN CONTINUE; END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

    -- Publieke SELECT (indien nog niet aanwezig)
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = tbl AND policyname = 'public_read'
    ) THEN
      EXECUTE format(
        'CREATE POLICY "public_read" ON public.%I FOR SELECT USING (true)', tbl
      );
    END IF;

    -- Admin INSERT
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = tbl AND policyname = 'admin_insert'
    ) THEN
      EXECUTE format(
        'CREATE POLICY "admin_insert" ON public.%I FOR INSERT WITH CHECK (public.is_admin())', tbl
      );
    END IF;

    -- Admin UPDATE
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = tbl AND policyname = 'admin_update'
    ) THEN
      EXECUTE format(
        'CREATE POLICY "admin_update" ON public.%I FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin())', tbl
      );
    END IF;

    -- Admin DELETE
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = tbl AND policyname = 'admin_delete'
    ) THEN
      EXECUTE format(
        'CREATE POLICY "admin_delete" ON public.%I FOR DELETE USING (public.is_admin())', tbl
      );
    END IF;
  END LOOP;
END
$$;

-- ──────────────────────────────────────────────────────────────────
-- 4. Unique constraint op commentaries — voorkom herhaalde dubbele imports
--    Gebruikt een partial unique index (scope is NOT NULL in dataset).
-- ──────────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS uq_commentaries_author_verse_scope
  ON public.commentaries (author_id, verse_id, scope)
  WHERE verse_id IS NOT NULL;
