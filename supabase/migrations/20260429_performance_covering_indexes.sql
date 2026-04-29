-- Performance advisor closure (security-fix follow-up).
-- Add covering indexes for foreign keys on tables owned by SchriftInzicht.
-- (ip_* tables belong to the MI Platform project sharing this database and
-- are intentionally left to that project to manage.)

CREATE INDEX IF NOT EXISTS idx_admins_granted_by                ON public.admins (granted_by);

CREATE INDEX IF NOT EXISTS idx_bookmarks_commentary_id          ON public.bookmarks (commentary_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_verse_id               ON public.bookmarks (verse_id);

CREATE INDEX IF NOT EXISTS idx_commentaries_passage_end_verse   ON public.commentaries (passage_end_verse_id);
CREATE INDEX IF NOT EXISTS idx_commentaries_source_work_id      ON public.commentaries (source_work_id);

CREATE INDEX IF NOT EXISTS idx_confession_proof_texts_verse_id  ON public.confession_proof_texts (verse_id);

CREATE INDEX IF NOT EXISTS idx_cross_references_to_verse        ON public.cross_references (to_verse_id);
CREATE INDEX IF NOT EXISTS idx_cross_references_to_verse_end    ON public.cross_references (to_verse_end_id);

CREATE INDEX IF NOT EXISTS idx_search_history_resolved_verse    ON public.search_history (resolved_verse_id);

CREATE INDEX IF NOT EXISTS idx_sermons_end_verse_id             ON public.sermons (end_verse_id);

-- Drop the duplicate / unused premium_until indexes on user_profiles.
-- Both indexes cover the same column and have never been read.
DROP INDEX IF EXISTS public.idx_user_profiles_premium_until;
DROP INDEX IF EXISTS public.user_profiles_premium_until_idx;
