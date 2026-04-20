import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Logo from '../components/Logo';
import { truncate } from '../lib/truncate';
import { displayBookName } from '../lib/parseReference';
import type { CatechismQuestion } from '../types/database';

interface SundaySection {
  title: string;
  questions: CatechismQuestion[];
}

interface ProofText {
  id: number;
  bookId: string;
  bookName: string;
  chapter: number;
  verse: number;
}

const BOOKMARKS_KEY = 'si-cat-bookmarks';

interface CatBookmark {
  questionNumber: number;
  lordDay: number | null;
  questionText: string;
  ts: number;
}

function loadBookmarks(): CatBookmark[] {
  try { return JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || '[]'); } catch { return []; }
}

function nowTs(): number {
  return Date.now();
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 3C5 2.44772 5.44772 2 6 2H14C14.5523 2 15 2.44772 15 3V17.5L10 14L5 17.5V3Z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

/** Format antwoordtekst: zet a), b), c) opsommingen onder elkaar */
function formatAnswer(text: string) {
  // Split op patronen als "a) ", "b) ", "ten eerste,", etc.
  const parts = text.split(/(?=[a-z]\)\s)/i);
  if (parts.length <= 1) return text;

  const intro = parts[0].trim();
  const items = parts.slice(1).map(p => p.trim());

  return (
    <>
      {intro && <span>{intro}</span>}
      <ol className="cat-answer-list" type="a">
        {items.map((item, i) => (
          <li key={i}>{item.replace(/^[a-z]\)\s*/i, '')}</li>
        ))}
      </ol>
    </>
  );
}

export default function Catechismus() {
  const [sections, setSections] = useState<SundaySection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [bookmarks, setBookmarks] = useState<CatBookmark[]>(loadBookmarks);
  const [proofTexts, setProofTexts] = useState<Record<string, ProofText[]>>({});

  useEffect(() => {
    (async () => {
      const [qRes, pRes] = await Promise.all([
        supabase.from('catechism_questions').select('*').order('question_number', { ascending: true }),
        supabase.from('catechism_proof_texts')
          .select('id, question_id, bible_verses!verse_id(book_id, chapter, verse, bible_books(name))')
          .order('id', { ascending: true }),
      ]);

      if (qRes.error) { setError('Kon catechismus niet laden.'); setLoading(false); return; }

      if (qRes.data) {
        const grouped: Record<number, CatechismQuestion[]> = {};
        for (const q of qRes.data) {
          const sunday = q.lord_day || 0;
          if (!grouped[sunday]) grouped[sunday] = [];
          grouped[sunday].push(q);
        }
        setSections(
          Object.entries(grouped)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([sunday, questions]) => ({
              title: Number(sunday) > 0 ? `Zondag ${sunday}` : 'Overig',
              questions,
            }))
        );
      }

      if (pRes.data) {
        type Row = { id: number; question_id: number; bible_verses: { book_id: string; chapter: number; verse: number; bible_books: { name: string } | null } | null };
        const byQ: Record<string, ProofText[]> = {};
        for (const row of pRes.data as unknown as Row[]) {
          const v = row.bible_verses;
          if (!v) continue;
          const qid = String(row.question_id);
          if (!byQ[qid]) byQ[qid] = [];
          byQ[qid].push({
            id: row.id,
            bookId: String(v.book_id),
            bookName: v.bible_books?.name || '',
            chapter: v.chapter,
            verse: v.verse,
          });
        }
        setProofTexts(byQ);
      }

      setLoading(false);
    })();
  }, []);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isBookmarked = (qNum: number) => bookmarks.some(b => b.questionNumber === qNum);

  const toggleBookmark = (q: CatechismQuestion) => {
    let updated: CatBookmark[];
    if (isBookmarked(q.question_number)) {
      updated = bookmarks.filter(b => b.questionNumber !== q.question_number);
    } else {
      updated = [{ questionNumber: q.question_number, lordDay: q.lord_day, questionText: q.question_text, ts: nowTs() }, ...bookmarks];
    }
    setBookmarks(updated);
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated));
  };

  if (loading) {
    return (
      <>
        <div className="screen-header"><h1>Catechismus</h1></div>
        <div className="page"><div className="loader"><div className="spinner" /></div></div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className="screen-header"><h1>Catechismus</h1></div>
        <div className="page"><div className="error-box">{error}</div></div>
      </>
    );
  }

  if (sections.length === 0) {
    return (
      <>
        <div className="screen-header"><h1>Catechismus</h1></div>
        <div className="page welcome">
          <h1>Catechismus</h1>
          <p>De Heidelbergse Catechismus wordt vannacht geladen.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="screen-header">
        <h1>Heidelbergse Catechismus</h1>
      </div>
      <div className="page">
        <Logo />
        {sections.map((section) => (
          <div key={section.title}>
            <div className="catechism-section-header">
              <h2>{section.title}</h2>
            </div>
            {section.questions.map((q) => {
              const isOpen = expanded[q.id];
              const answer = q.answer_text || '';
              const preview = truncate(answer, 150);
              const hasMore = answer.length > 150;
              return (
                <div key={q.id} className="question-card">
                  <div className="cat-card-top">
                    <span className="cat-label">Vraag {q.question_number}</span>
                    <button
                      className={`save-btn ${isBookmarked(q.question_number) ? 'saved' : ''}`}
                      onClick={(e) => { e.stopPropagation(); toggleBookmark(q); }}
                      title={isBookmarked(q.question_number) ? 'Bladwijzer verwijderen' : 'Bladwijzer toevoegen'}
                    >
                      <BookmarkIcon filled={isBookmarked(q.question_number)} />
                    </button>
                  </div>
                  <div className="question-text" data-edit-table="catechism_questions" data-edit-id={q.id} data-edit-col="question_text" data-edit-label={`Vraag ${q.question_number}`}>{q.question_text}</div>
                  <div className="answer-container">
                    <div className="answer-label">Antwoord:</div>
                    <div className="answer-text" data-edit-table="catechism_questions" data-edit-id={q.id} data-edit-col="answer_text" data-edit-label={`Antwoord ${q.question_number}`}>{isOpen ? formatAnswer(answer) : preview}</div>
                    {hasMore && (
                      <div className="expand-hint" onClick={() => toggleExpand(q.id)}>
                        {isOpen ? 'Inklappen \u25B2' : 'Meer lezen \u25BC'}
                      </div>
                    )}
                  </div>
                  {(isOpen || !hasMore) && proofTexts[String(q.id)]?.length > 0 && (
                    <div className="cat-proofs">
                      <div className="cat-proofs-label">Bewijsteksten</div>
                      <div className="cat-proofs-list">
                        {proofTexts[String(q.id)].map(p => (
                          <Link
                            key={p.id}
                            to={`/bijbel/${p.bookId}/${p.chapter}?name=${encodeURIComponent(p.bookName)}&hlStart=${p.verse}&hlEnd=${p.verse}`}
                            className="cat-proof-ref"
                          >
                            {displayBookName(p.bookName)} {p.chapter}:{p.verse}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </>
  );
}
