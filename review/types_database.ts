export interface BibleBook {
  id: number;
  name: string;
  abbreviation: string;
  testament: 'OT' | 'NT';
  book_order: number;
  chapter_count: number;
}

export interface BibleVerse {
  id: number;
  book_id: number;
  chapter: number;
  verse: number;
  text_sv: string;
  text_hsv: string | null;
  bible_books?: BibleBook;
}

export interface Author {
  id: number;
  name: string;
  name_original: string | null;
  born_year: number | null;
  died_year: number | null;
  era: string | null;
  tradition: string | null;
  biography: string | null;
  country: string | null;
  portrait_url: string | null;
}

export interface Commentary {
  id: number;
  verse_id: number;
  author_id: number;
  source_work_id: number | null;
  commentary_text: string;
  year_written: number | null;
  language: string;
  is_translated: boolean;
  scope: string;
  passage_end_verse_id: number | null;
  authors?: Author;
}

export interface Kanttekening {
  id: number;
  verse_id: number;
  marker: string | null;
  note_text: string;
  note_order: number;
}

export interface CatechismQuestion {
  id: number;
  lord_day: number;
  question_number: number;
  question_text: string;
  answer_text: string;
}

export interface Bookmark {
  id: string;
  user_id: string;
  verse_id: number;
  note: string | null;
  created_at: string;
}

export interface CrossReference {
  id: number;
  from_verse_id: number;
  to_verse_id: number;
  to_verse_end_id: number | null;
  votes: number;
  to_verse?: {
    id?: number;
    book_id?: number;
    chapter: number;
    verse: number;
    text_sv?: string;
    bible_books?: { name: string; abbreviation: string };
  };
}
