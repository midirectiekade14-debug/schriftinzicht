-- Security audit hardening (260429-1910-stride-owasp-full-audit)
-- Addresses:
--   M-1  Single hardcoded admin UUID across all RLS write policies → admins table
--   L-1  donations RLS-no-policy → explicit deny + table comment
--   L-4  Trigger fns exposed via PostgREST RPC → REVOKE EXECUTE

BEGIN;

------------------------------------------------------------
-- M-1: Replace hardcoded UUID with an admins-table check
------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.admins (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid REFERENCES auth.users(id),
  note       text
);
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Only admins can see the admins table; nobody else.
DROP POLICY IF EXISTS admins_self_visible ON public.admins;
CREATE POLICY admins_self_visible ON public.admins
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- No write policies → only service-role (= migration / dashboard) can mutate.

-- Bootstrap with the existing single admin so we don't lock ourselves out.
INSERT INTO public.admins (user_id, note)
VALUES ('7e2ac885-0cdf-42a4-9f10-ca84bf1d889e', 'bootstrap from hardcoded RLS UUID')
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid());
$$;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Swap every content-table write policy from the hardcoded UUID over to
-- public.is_admin(). Read policies (Public read) are left untouched.
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'authors', 'bible_verses', 'commentaries', 'kanttekeningen',
    'sermons', 'source_works', 'cross_references',
    'catechism_questions', 'catechism_proof_texts',
    'confessions', 'confession_articles', 'confession_proof_texts'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Admin kan toevoegen - %1$s" ON public.%1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "Admin kan bijwerken" ON public.%1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "Admin kan verwijderen - %1$s" ON public.%1$s', t);

    EXECUTE format($q$
      CREATE POLICY admin_insert ON public.%1$s
        FOR INSERT TO authenticated
        WITH CHECK (public.is_admin())
    $q$, t);

    EXECUTE format($q$
      CREATE POLICY admin_update ON public.%1$s
        FOR UPDATE TO authenticated
        USING (public.is_admin())
        WITH CHECK (public.is_admin())
    $q$, t);

    EXECUTE format($q$
      CREATE POLICY admin_delete ON public.%1$s
        FOR DELETE TO authenticated
        USING (public.is_admin())
    $q$, t);
  END LOOP;
END $$;

------------------------------------------------------------
-- L-1: donations — make the deny-all explicit + document it
------------------------------------------------------------

COMMENT ON TABLE public.donations IS
  'Service-role only. Inserts via donation-create edge function, updates via '
  'donation-webhook. RLS deny-all is intentional; never add anon/auth policies.';

DROP POLICY IF EXISTS donations_explicit_deny ON public.donations;
CREATE POLICY donations_explicit_deny ON public.donations
  FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

------------------------------------------------------------
-- L-4: Trigger functions exposed via PostgREST RPC
------------------------------------------------------------

-- handle_new_user / handle_new_ip_user are AFTER-INSERT triggers on
-- auth.users. They live in the public schema so PostgREST exposes them as
-- /rest/v1/rpc/handle_new_user. Calling them via RPC fails (NEW unbound)
-- but the linter still flags it as an exposed SECURITY DEFINER function.
REVOKE EXECUTE ON FUNCTION public.handle_new_user()    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_ip_user() FROM PUBLIC, anon, authenticated;
-- Triggers continue to fire (they execute as the table owner, not via RPC).

COMMIT;
