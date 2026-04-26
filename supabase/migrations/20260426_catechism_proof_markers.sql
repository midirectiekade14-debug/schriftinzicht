-- Catechism proof texts: add marker + sort_order columns to group proofs by letter (a, b, c, ...)
-- The marker matches the superscript letter in the answer text. Multiple proof rows
-- can share the same marker -> they're alternative bewijsteksten for that group.
-- NULL marker = ungrouped (legacy rows; UI falls back to flat list & strips letters).
--
-- Data is seeded via supabase/seed_catechism_markers.py (parses the classical HC PDF).
-- ~98% match rate; remaining ~2% are tracked in supabase/data/catechism_markers_mismatches.txt.

alter table public.catechism_proof_texts
  add column if not exists marker text,
  add column if not exists sort_order smallint;

create index if not exists catechism_proof_texts_q_marker_idx
  on public.catechism_proof_texts (question_id, marker, sort_order);
