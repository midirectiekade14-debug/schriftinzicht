export interface BibleBook {
  id: string;
  name: string;
  abbreviation: string;
  testament: 'OT' | 'NT';
  book_order: number;
  chapter_count: number;
}

export interface BibleVerse {
  id: string;
  book_id: string;
  chapter: number;
  verse: number;
  text_sv: string;
  text_hsv: string | null;
  bible_books?: BibleBook;
}

export interface Author {
  id: string;
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
  id: string;
  verse_id: string;
  author_id: string;
  source_work_id: string | null;
  commentary_text: string;
  year_written: number | null;
  language: string;
  is_translated: boolean;
  scope: string;
  passage_end_verse_id: string | null;
  authors?: Author;
}

export interface Kanttekening {
  id: string;
  verse_id: string;
  marker: string | null;
  note_text: string;
  note_order: number;
}

export interface CatechismQuestion {
  id: string;
  lord_day: number | null;
  question_number: number;
  question_text: string;
  answer_text: string;
}

export interface CrossReferenceToVerse {
  id: string;
  book_id: string;
  chapter: number;
  verse: number;
  text_sv: string;
  bible_books?: { name: string; abbreviation: string };
}

export interface CrossReference {
  id: string;
  from_verse_id: string;
  to_verse_id: string;
  to_verse_end_id: string | null;
  votes: number;
  to_verse?: CrossReferenceToVerse;
}
