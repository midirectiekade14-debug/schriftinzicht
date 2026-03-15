-- Supabase SQL: Maak cross_references tabel aan
-- Uitvoeren via: Supabase Dashboard → SQL Editor → plak + run

CREATE TABLE IF NOT EXISTS public.cross_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_verse_id uuid NOT NULL REFERENCES public.bible_verses(id) ON DELETE CASCADE,
  to_verse_id uuid NOT NULL REFERENCES public.bible_verses(id) ON DELETE CASCADE,
  to_verse_end_id uuid REFERENCES public.bible_verses(id) ON DELETE SET NULL,
  votes integer NOT NULL DEFAULT 0
);

-- Indices voor snelle queries per vers
CREATE INDEX IF NOT EXISTS idx_cross_refs_from ON public.cross_references(from_verse_id);
CREATE INDEX IF NOT EXISTS idx_cross_refs_votes ON public.cross_references(votes DESC);

-- RLS: iedereen mag lezen
ALTER TABLE public.cross_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "cross_references_public_read"
  ON public.cross_references FOR SELECT
  USING (true);
