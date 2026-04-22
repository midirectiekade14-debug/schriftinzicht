-- SchriftInzicht — Isaac Ambrose correct toeschrijven
-- Datum: 2026-04-22
--
-- Probleem:
--   A) ~101 preken uit `sermons_extra_spurgeon_extra.json` staan onder Spurgeon
--      maar zijn feitelijk werken van Isaac Ambrose (Puritein, 1604-1664).
--      Bron: "Het Zien op Jezus" / "Looking unto Jesus".
--   B) ~194 preken in de DB staan onder author "Ambrosius" (kerkvader 4e eeuw)
--      maar zijn feitelijk Isaac Ambrose (Puritein 1604-1664).
--
-- Strategie: (1) zorg dat Isaac Ambrose als author bestaat, (2) verplaats
-- records van de foutieve auteurs naar hem, (3) laat Ambrosius bestaan
-- (voor als er WEL echte kerkvader-teksten komen) maar zet `active=false` tot
-- bewezen werken erbij komen.
--
-- !! Verifieer elk DISCOVERY-resultaat voordat je de UPDATE uitvoert. !!

-- ──────────────────────────────────────────────────────────────────
-- STAP 1: Zorg dat Isaac Ambrose als auteur bestaat
-- ──────────────────────────────────────────────────────────────────

INSERT INTO public.authors (name, era, tradition, birth_year, death_year, bio)
SELECT
  'Isaac Ambrose',
  'Puriteinse periode',
  'Puriteinen (Engeland)',
  1604,
  1664,
  'Engels puriteins predikant. Bekendste werk: "Looking unto Jesus" (1658), vertaald als "Het Zien op Jezus". Niet te verwarren met kerkvader Ambrosius van Milaan (339-397).'
WHERE NOT EXISTS (
  SELECT 1 FROM public.authors WHERE name = 'Isaac Ambrose'
);

-- ──────────────────────────────────────────────────────────────────
-- STAP 2: DISCOVERY — welke records moeten verhuizen?
-- ──────────────────────────────────────────────────────────────────
-- Voer deze SELECTs uit in de Supabase SQL Editor en controleer
-- handmatig dat het de juiste records zijn, voordat je STAP 3 runt.

-- 2A. Spurgeon-preken die eigenlijk Ambrose zijn (bron: "Het Zien op Jezus")
-- SELECT id, title, source_work_id, start_verse_id, LEFT(sermon_text, 160)
-- FROM public.sermons s
-- JOIN public.authors a ON a.id = s.author_id
-- WHERE a.name = 'Spurgeon'
--   AND (
--     s.source_collection ILIKE '%Ambrose%' OR
--     s.source_collection ILIKE '%Zien op Jezus%' OR
--     s.source_collection ILIKE '%Looking unto Jesus%' OR
--     s.title ILIKE '%zien op Jezus%'
--   );

-- 2B. Preken onder "Ambrosius" (kerkvader) die eigenlijk Isaac Ambrose zijn
-- SELECT id, title, source_work_id, start_verse_id, LEFT(sermon_text, 160)
-- FROM public.sermons s
-- JOIN public.authors a ON a.id = s.author_id
-- WHERE a.name = 'Ambrosius'
--   AND (
--     s.source_collection ILIKE '%Ambrose%' OR
--     s.source_collection ILIKE '%Zien op Jezus%' OR
--     s.source_collection ILIKE '%Looking unto Jesus%' OR
--     s.title ILIKE '%zien op Jezus%' OR
--     EXTRACT(YEAR FROM s.year_written) BETWEEN 1600 AND 1700
--   );

-- ──────────────────────────────────────────────────────────────────
-- STAP 3: RE-ATTRIBUTIE (pas uitvoeren na verificatie van STAP 2)
-- ──────────────────────────────────────────────────────────────────
-- Vervang `<AMBROSE_WHERE>` met de SELECT-condities uit STAP 2 die
-- correct bleken. Voorbeeld-fragment uitgeschreven:

-- UPDATE public.sermons
--   SET author_id = (SELECT id FROM public.authors WHERE name = 'Isaac Ambrose')
-- WHERE author_id = (SELECT id FROM public.authors WHERE name = 'Spurgeon')
--   AND (
--     source_collection ILIKE '%Ambrose%'
--     OR source_collection ILIKE '%Zien op Jezus%'
--     OR source_collection ILIKE '%Looking unto Jesus%'
--     OR title ILIKE '%zien op Jezus%'
--   );

-- UPDATE public.sermons
--   SET author_id = (SELECT id FROM public.authors WHERE name = 'Isaac Ambrose')
-- WHERE author_id = (SELECT id FROM public.authors WHERE name = 'Ambrosius')
--   AND (
--     source_collection ILIKE '%Ambrose%'
--     OR source_collection ILIKE '%Zien op Jezus%'
--     OR source_collection ILIKE '%Looking unto Jesus%'
--     OR title ILIKE '%zien op Jezus%'
--   );

-- ──────────────────────────────────────────────────────────────────
-- STAP 4: Gezondheidscheck
-- ──────────────────────────────────────────────────────────────────
-- SELECT a.name, COUNT(*) FROM public.sermons s
-- JOIN public.authors a ON a.id = s.author_id
-- WHERE a.name IN ('Isaac Ambrose', 'Ambrosius', 'Spurgeon')
-- GROUP BY a.name;
