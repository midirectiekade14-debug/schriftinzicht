-- Catechism proof texts: add marker column to group proofs by letter (a, b, c, …)
-- The marker matches the superscript letter in the answer text. Multiple proof rows
-- can share the same marker → they're alternative bewijsteksten for that group.
-- NULL marker = ungrouped (legacy rows; UI falls back to flat list & strips letters).

alter table public.catechism_proof_texts
  add column if not exists marker text;

create index if not exists catechism_proof_texts_q_marker_idx
  on public.catechism_proof_texts (question_id, marker);

-- Seed Heidelbergse Catechismus Vraag 1 (Zondag 1).
-- Standard reformed mapping (Romeinen 14:7-9, etc.). Verse-IDs are stable.
update public.catechism_proof_texts pt set marker = m.marker
from (values
  (3145, 'a'),
  (3146, 'b'), (3147, 'b'), (3148, 'b'),
  (3149, 'c'), (3150, 'c'), (3151, 'c'), (3152, 'c'), (3153, 'c'), (3154, 'c'),
  (3155, 'd'),
  (3156, 'e'), (3157, 'e'),
  (3158, 'f'), (3159, 'f'),
  (3160, 'g'), (3161, 'g'),
  (3162, 'h'),
  (3163, 'i'), (3164, 'i'), (3165, 'i'), (3166, 'i'),
  (3167, 'j'), (3168, 'j')
) as m(id, marker)
where pt.id = m.id;
