-- SchriftInzicht — Premium kolommen toevoegen aan user_profiles
-- Voer uit in Supabase SQL Editor (Dashboard → SQL → New Query)

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS premium_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS mollie_customer_id TEXT;

-- Index voor snelle premium-checks
CREATE INDEX IF NOT EXISTS idx_user_profiles_premium_until
  ON user_profiles (premium_until)
  WHERE premium_until IS NOT NULL;

-- RLS: gebruiker mag alleen eigen profiel lezen/updaten
-- (check of er al RLS policies bestaan, zo niet: aanmaken)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Eigen profiel lezen
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'Users can read own profile'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can read own profile" ON user_profiles FOR SELECT USING (auth.uid() = id)';
  END IF;
END
$$;

-- Eigen profiel updaten (alleen display_name en preferred_translation — NIET premium_until)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'Users can update own profile'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id)';
  END IF;
END
$$;

-- Service role mag premium_until en mollie_customer_id updaten (voor webhooks)
-- Service role bypassed RLS automatisch, geen extra policy nodig.

-- Trigger: automatisch user_profiles row aanmaken bij nieuwe registratie
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name, created_at)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', ''), NOW())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop en recreate trigger (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
