import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Logo from '../components/Logo';
import { truncate } from '../lib/truncate';
import { displayBookName } from '../lib/parseReference';
import type { CatechismQuestion } from '../types/database';
import { clickable } from '../lib/a11y';
import VersePopup from '../components/VersePopup';

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
  marker: string | null;
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

/** Format antwoordtekst: markeer losse letters (a, b, c, ...) als klikbare badges.
 *  Letters worden alleen weergegeven als er bewijsteksten met die marker bestaan
 *  (anders zijn ze visuele ruis zonder doel). Klikken markeert de bewijstekst-groep.
 */
function formatAnswer(
  text: string,
  availableMarkers: Set<string>,
  activeMarker: string | null,
  onMarkerClick?: (letter: string) => void,
) {
  if (!text) return text;
  const BOUNDARY = /[\s,;:.]/;
  const nodes: React.ReactNode[] = [];
  let pos = 0;
  const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

  // Sequentieel: zoek a, dan b vanaf positie van a, dan c, etc.
  // Als een letter NIET gevonden wordt vanaf pos, sla over en probeer de volgende —
  // dit voorkomt dat een gap in de reeks (bv. ontbrekende 'b') alle latere markers laat verdwijnen.
  let consecutiveMisses = 0;
  for (let letterIdx = 0; letterIdx < LETTERS.length; letterIdx++) {
    const L = LETTERS[letterIdx];
    let found = -1;
    for (let i = pos; i < text.length; i++) {
      if (text[i] !== L) continue;
      const prev = text[i - 1];
      const next = text[i + 1];
      if (prev !== undefined && BOUNDARY.test(prev) && next !== undefined && BOUNDARY.test(next)) {
        found = i;
        break;
      }
    }
    if (found === -1) {
      // Sla deze letter over maar stop als er 3 op rij missen (dan zit er geen marker-reeks meer in de rest).
      if (++consecutiveMisses >= 3) break;
      continue;
    }
    consecutiveMisses = 0;
    if (found > pos) nodes.push(text.slice(pos, found));

    if (availableMarkers.has(L) && onMarkerClick) {
      const isActive = activeMarker === L;
      nodes.push(
        <button
          key={`cm-${L}`}
          type="button"
          className={`cat-marker cat-marker-btn${isActive ? ' active' : ''}`}
          onClick={(e) => { e.stopPropagation(); onMarkerClick(L); }}
          aria-label={`Bewijstekst-groep ${L}`}
        >{L}</button>
      );
    }
    // Letter heeft geen mapping in DB → strip uit tekst (geen verwarrende losse letter).
    pos = found + 1;
  }
  if (pos < text.length) nodes.push(text.slice(pos));

  if (nodes.length === 0) return text;
  return <>{nodes}</>;
}

export default function Catechismus() {
  const [sections, setSections] = useState<SundaySection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [bookmarks, setBookmarks] = useState<CatBookmark[]>(loadBookmarks);
  const [proofTexts, setProofTexts] = useState<Record<string, ProofText[]>>({});
  const [versePopup, setVersePopup] = useState<{
    book: string;
    chapter: number;
    verseStart: number;
    rect: DOMRect;
    questionId: string;
    questionNumber: number;
  } | null>(null);
  const [activeMarker, setActiveMarker] = useState<Record<string, string | null>>({});

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const [qRes, pRes] = await Promise.all([
        supabase.from('catechism_questions').select('*').order('question_number', { ascending: true }),
        supabase.from('catechism_proof_texts')
          .select('id, question_id, marker, bible_verses!verse_id(book_id, chapter, verse, bible_books(name))')
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
        type Row = { id: number; question_id: number; marker: string | null; bible_verses: { book_id: string; chapter: number; verse: number; bible_books: { name: string } | null } | null };
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
            marker: row.marker,
          });
        }
        setProofTexts(byQ);
      }

      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (loading) return;
    const restore = location.state as { restoreScrollY?: number; restoreExpandedId?: string } | null;
    if (!restore) return;

    const expandId = restore.restoreExpandedId;
    if (expandId) {
      setExpanded(prev => ({ ...prev, [expandId]: true }));
    }
    if (typeof restore.restoreScrollY === 'number') {
      const y = restore.restoreScrollY;
      requestAnimationFrame(() => window.scrollTo(0, y));
    }

    navigate(`${location.pathname}${location.search}${location.hash}`, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Scroll naar actieve marker NA DOM-update zodat de proof-group div zeker gerenderd is.
  useEffect(() => {
    for (const [qid, letter] of Object.entries(activeMarker)) {
      if (!letter) continue;
      const el = document.getElementById(`proof-group-${qid}-${letter}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        break;
      }
    }
  }, [activeMarker, expanded]);

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
              const qid = String(q.id);
              const isOpen = expanded[q.id];
              const answer = q.answer_text || '';
              const preview = truncate(answer, 150);
              const hasMore = answer.length > 150;
              const proofs = proofTexts[qid] ?? [];
              const markersInProofs = new Set<string>();
              for (const p of proofs) if (p.marker) markersInProofs.add(p.marker);
              const groupedProofs: { marker: string | null; items: ProofText[] }[] = [];
              for (const p of proofs) {
                const last = groupedProofs[groupedProofs.length - 1];
                if (last && last.marker === p.marker) last.items.push(p);
                else groupedProofs.push({ marker: p.marker, items: [p] });
              }
              const myActive = activeMarker[qid] ?? null;
              const handleMarkerClick = (letter: string) => {
                if (!isOpen) setExpanded(prev => ({ ...prev, [q.id]: true }));
                setActiveMarker(prev => ({ ...prev, [qid]: prev[qid] === letter ? null : letter }));
                // Scroll wordt afgehandeld door useEffect dat luistert op activeMarker + expanded,
                // zodat de DOM zeker bestaat als de kaart open klapt door de klik.
              };
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
                    <div className="answer-text" data-edit-table="catechism_questions" data-edit-id={q.id} data-edit-col="answer_text" data-edit-label={`Antwoord ${q.question_number}`}>
                      {formatAnswer(isOpen ? answer : preview, markersInProofs, myActive, handleMarkerClick)}
                    </div>
                    {hasMore && (
                      <div className="expand-hint" {...clickable(() => toggleExpand(q.id), { expanded: isOpen, label: isOpen ? 'Inklappen' : 'Meer lezen' })}>
                        {isOpen ? 'Inklappen \u25B2' : 'Meer lezen \u25BC'}
                      </div>
                    )}
                  </div>
                  {(isOpen || !hasMore) && proofs.length > 0 && (
                    <div className="cat-proofs">
                      <div className="cat-proofs-label">Bewijsteksten</div>
                      {markersInProofs.size > 0 ? (
                        <div className="cat-proofs-grouped">
                          {groupedProofs.map((g, gi) => (
                            <div
                              key={`${g.marker ?? 'none'}-${gi}`}
                              id={g.marker ? `proof-group-${qid}-${g.marker}` : undefined}
                              className={`cat-proof-group${g.marker && myActive === g.marker ? ' active' : ''}`}
                            >
                              {g.marker && <span className="cat-proof-group-letter">{g.marker}</span>}
                              <div className="cat-proofs-list">
                                {g.items.map(p => (
                                  <button
                                    key={p.id}
                                    type="button"
                                    className="cat-proof-ref"
                                    onClick={(e) => {
                                      const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                                      setVersePopup({
                                        book: p.bookName,
                                        chapter: p.chapter,
                                        verseStart: p.verse,
                                        rect,
                                        questionId: qid,
                                        questionNumber: q.question_number,
                                      });
                                    }}
                                  >
                                    {displayBookName(p.bookName)} {p.chapter}:{p.verse}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="cat-proofs-list">
                          {proofs.map(p => (
                            <button
                              key={p.id}
                              type="button"
                              className="cat-proof-ref"
                              onClick={(e) => {
                                const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                                setVersePopup({
                                  book: p.bookName,
                                  chapter: p.chapter,
                                  verseStart: p.verse,
                                  rect,
                                  questionId: qid,
                                  questionNumber: q.question_number,
                                });
                              }}
                            >
                              {displayBookName(p.bookName)} {p.chapter}:{p.verse}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {versePopup && (
        <VersePopup
          book={versePopup.book}
          chapter={versePopup.chapter}
          verseStart={versePopup.verseStart}
          anchorRect={versePopup.rect}
          onClose={() => setVersePopup(null)}
          returnState={{
            returnTo: '/catechismus',
            returnLabel: `Catechismus (Vraag ${versePopup.questionNumber})`,
            returnScrollY: window.scrollY,
            returnExpandedId: versePopup.questionId,
          }}
        />
      )}
    </>
  );
}
