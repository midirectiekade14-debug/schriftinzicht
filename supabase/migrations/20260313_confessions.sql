-- Belijdenisgeschriften: NGB (37 artikelen) + DL (5 hoofdstukken)
CREATE TABLE IF NOT EXISTS confession_articles (
  id SERIAL PRIMARY KEY,
  confession TEXT NOT NULL CHECK (confession IN ('NGB', 'DL')),
  section_number INTEGER NOT NULL,     -- NGB: artikel 1-37, DL: hoofdstuk 1-5 (3/4 = 3)
  section_title TEXT NOT NULL,          -- titel van artikel/hoofdstuk
  article_number INTEGER DEFAULT 0,    -- DL: sub-artikel nummer per hoofdstuk, NGB: 0
  article_text TEXT NOT NULL,
  is_rejection BOOLEAN DEFAULT FALSE,  -- DL: verwerping van de dwalingen
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_confession_type ON confession_articles(confession);
CREATE INDEX idx_confession_section ON confession_articles(confession, section_number);

-- Enable RLS
ALTER TABLE confession_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "confession_articles_read" ON confession_articles FOR SELECT USING (true);

-- Proof texts linking confession articles to Bible verses
CREATE TABLE IF NOT EXISTS confession_proof_texts (
  id SERIAL PRIMARY KEY,
  article_id INTEGER NOT NULL REFERENCES confession_articles(id) ON DELETE CASCADE,
  verse_id INTEGER REFERENCES bible_verses(id),
  reference_text TEXT,  -- fallback if verse_id not found
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cpt_article ON confession_proof_texts(article_id);
CREATE INDEX idx_cpt_verse ON confession_proof_texts(verse_id);

ALTER TABLE confession_proof_texts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "confession_proof_texts_read" ON confession_proof_texts FOR SELECT USING (true);
