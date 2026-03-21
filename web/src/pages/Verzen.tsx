import { useEffect, useState, useCallback } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { BibleVerse, Kanttekening, Commentary } from '../types/database';
import { truncate } from '../lib/truncate';
import { displayBookName, expandInlineRefs } from '../lib/parseReference';
import SelectionPopup from '../components/SelectionPopup';

interface CommentaryWithAuthor extends Omit<Commentary, 'authors'> {
  authors: { name: string; born_year: number | null; died_year: number | null } | null;
}

interface CrossRefRow {
  id: string;
  votes: number;
  to_verse_end_id: string | null;
  to_verse: { id: string; book_id: string; chapter: number; verse: number; text_sv: string; bible_books: { name: string; abbreviation: string } };
}

interface SermonRow {
  id: string;
  title: string;
  sermon_text: string;
  source_collection: string | null;
  authors: { name: string; born_year: number | null; died_year: number | null } | null;
}

const BM_KEY = 'si-bijbel-bookmarks';
const DETAIL_BM_KEY = 'si-detail-bookmarks';

interface BijbelBookmark {
  bookId: string;
  bookName: string;
  chapter: number;
  ts: number;
}

interface DetailBookmark {
  type: 'kanttekening' | 'verklaring';
  id: string;
  text: string;
  authorName: string;
  verseRef: string;
  sourceUrl?: string;
  ts: number;
}

function loadBookmarks(): BijbelBookmark[] {
  try { return JSON.parse(localStorage.getItem(BM_KEY) || '[]'); } catch { return []; }
}

function loadDetailBookmarks(): DetailBookmark[] {
  try { return JSON.parse(localStorage.getItem(DETAIL_BM_KEY) || '[]'); } catch { return []; }
}

export default function Verzen() {
  const { bookId, chapter } = useParams();
  const [searchParams] = useSearchParams();
  const rawBookName = searchParams.get('name') || 'Boek';
  const bookName = displayBookName(rawBookName);
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedVerse, setExpandedVerse] = useState<string | null>(null);
  const [kanttekeningen, setKanttekeningen] = useState<Kanttekening[]>([]);
  const [commentaries, setCommentaries] = useState<CommentaryWithAuthor[]>([]);
  const [crossRefs, setCrossRefs] = useState<CrossRefRow[]>([]);
  const [sermons, setSermons] = useState<SermonRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedCommentary, setExpandedCommentary] = useState<Record<string, boolean>>({});
  const [expandedSermon, setExpandedSermon] = useState<Record<string, boolean>>({});
  const [chapterCount, setChapterCount] = useState(0);
  const [bookmarks, setBookmarks] = useState<BijbelBookmark[]>(loadBookmarks);
  const [detailBookmarks, setDetailBookmarks] = useState<DetailBookmark[]>(loadDetailBookmarks);
  const navigate = useNavigate();

  const chapterNum = parseInt(chapter!, 10);

  useEffect(() => {
    setError('');
    supabase
      .from('bible_verses')
      .select('*')
      .eq('book_id', bookId!)
      .eq('chapter', chapterNum)
      .order('verse', { ascending: true })
      .then(({ data, error: err }) => {
        if (err) { setError('Kon verzen niet laden.'); }
        else { setVerses(data || []); }
        setLoading(false);
      });
    supabase
      .from('bible_books')
      .select('chapter_count')
      .eq('id', bookId!)
      .single()
      .then(({ data }) => {
        if (data) setChapterCount(data.chapter_count);
      });
  }, [bookId, chapter, chapterNum]);

  // Kanttekening markers
  const [verseMarkers, setVerseMarkers] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (verses.length === 0) return;
    const vids = verses.map(v => v.id);
    supabase
      .from('kanttekeningen')
      .select('verse_id, marker')
      .in('verse_id', vids)
      .order('note_order', { ascending: true })
      .then(({ data }) => {
        const map: Record<string, string[]> = {};
        for (const row of (data || [])) {
          if (row.marker) {
            if (!map[row.verse_id]) map[row.verse_id] = [];
            map[row.verse_id].push(row.marker);
          }
        }
        setVerseMarkers(map);
      });
  }, [verses]);

  const toggleVerse = useCallback(async (verseId: string) => {
    if (expandedVerse === verseId) {
      setExpandedVerse(null);
      return;
    }

    setExpandedVerse(verseId);
    setDetailLoading(true);
    setExpandedCommentary({});
    setExpandedSermon({});

    try {
    const [kantRes, commRes, crossRes, sermonRes] = await Promise.all([
      supabase
        .from('kanttekeningen')
        .select('*')
        .eq('verse_id', verseId)
        .order('note_order', { ascending: true }),
      supabase
        .from('commentaries')
        .select('*, authors(name, born_year, died_year)')
        .eq('verse_id', verseId)
        .neq('scope', 'book')
        .order('year_written', { ascending: true }),
      supabase
        .from('cross_references')
        .select('id, votes, to_verse_end_id, to_verse:bible_verses!to_verse_id(id, book_id, chapter, verse, text_sv, bible_books(name, abbreviation))')
        .eq('from_verse_id', verseId)
        .order('votes', { ascending: false })
        .limit(15),
      supabase
        .from('sermons')
        .select('id, title, sermon_text, source_collection, authors(name, born_year, died_year)')
        .eq('start_verse_id', verseId)
        .limit(20),
    ]);

    setKanttekeningen(kantRes.data || []);

    const allComm = (commRes.data || []) as CommentaryWithAuthor[];
    const byAuthor = new Map<string, CommentaryWithAuthor[]>();
    for (const c of allComm) {
      const list = byAuthor.get(c.author_id) || [];
      list.push(c);
      byAuthor.set(c.author_id, list);
    }
    const deduped: CommentaryWithAuthor[] = [];
    for (const [, recs] of byAuthor) {
      if (recs.length === 1) {
        deduped.push(recs[0]);
      } else {
        const verse = recs.find(r => r.scope === 'verse');
        deduped.push(verse || recs[0]);
      }
    }
    deduped.sort((a, b) => (a.year_written || 0) - (b.year_written || 0));
    setCommentaries(deduped);
    setCrossRefs((crossRes.data || []) as unknown as CrossRefRow[]);
    setSermons((sermonRes.data || []) as unknown as SermonRow[]);
    } catch {
      setError('Kon details niet laden.');
    } finally {
      setDetailLoading(false);
    }
  }, [expandedVerse]);

  const toggleCommentary = (id: string) => {
    setExpandedCommentary((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const goChapter = (ch: number) => {
    navigate(`/bijbel/${bookId}/${ch}?name=${encodeURIComponent(bookName)}`);
  };

  const isBookmarked = bookmarks.some(b => b.bookId === bookId && b.chapter === chapterNum);

  const toggleBookmark = () => {
    let updated: BijbelBookmark[];
    if (isBookmarked) {
      updated = bookmarks.filter(b => !(b.bookId === bookId && b.chapter === chapterNum));
    } else {
      updated = [{ bookId: bookId!, bookName, chapter: chapterNum, ts: Date.now() }, ...bookmarks];
    }
    setBookmarks(updated);
    localStorage.setItem(BM_KEY, JSON.stringify(updated));
  };

  const isDetailBookmarked = (id: string) => detailBookmarks.some(b => b.id === id);

  const toggleDetailBookmark = (type: 'kanttekening' | 'verklaring', id: string, text: string, authorName: string) => {
    let updated: DetailBookmark[];
    if (isDetailBookmarked(id)) {
      updated = detailBookmarks.filter(b => b.id !== id);
    } else {
      const verseRef = `${bookName} ${chapter}`;
      const sourceUrl = `/bijbel/${bookId}/${chapter}?name=${encodeURIComponent(rawBookName)}`;
      updated = [{ type, id, text: text.slice(0, 200), authorName, verseRef, sourceUrl, ts: Date.now() }, ...detailBookmarks];
    }
    setDetailBookmarks(updated);
    localStorage.setItem(DETAIL_BM_KEY, JSON.stringify(updated));
  };

  if (loading) {
    return (
      <>
        <div className="screen-header">
          <Link to={`/bijbel/${bookId}?name=${encodeURIComponent(bookName)}&chapters=${chapterCount || 999}`} className="back-link">&lsaquo; {bookName}</Link>
          <h1>{bookName} {chapter}</h1>
        </div>
        <div className="page"><div className="loader"><div className="spinner" /></div></div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className="screen-header">
          <Link to={`/bijbel/${bookId}?name=${encodeURIComponent(bookName)}&chapters=${chapterCount || 999}`} className="back-link">&lsaquo; {bookName}</Link>
          <h1>{bookName} {chapter}</h1>
        </div>
        <div className="page"><div className="error-box">{error}</div></div>
      </>
    );
  }

  return (
    <>
      <div className="screen-header">
        <Link to={`/bijbel/${bookId}?name=${encodeURIComponent(bookName)}&chapters=${chapterCount || 999}`} className="back-link">&lsaquo; {bookName}</Link>
        <h1>{bookName} {chapter}</h1>
      </div>
      <div className="page">
        {/* Parchment-style book page */}
        <div className="bijbel-page">
          {/* Page header */}
          <div className="bl-page-head">
            <span className="bl-head-rule" />
            <span className="bl-head-title">{bookName} {chapter}</span>
            <button
              className={`bl-bookmark-btn ${isBookmarked ? 'bl-bookmarked' : ''}`}
              onClick={toggleBookmark}
              title="Bladwijzer"
            >
              <svg width="20" height="24" viewBox="0 0 20 20" fill="none">
                <path d="M5 3C5 2.44772 5.44772 2 6 2H14C14.5523 2 15 2.44772 15 3V17.5L10 14L5 17.5V3Z"
                  fill={isBookmarked ? 'var(--accent)' : 'none'}
                  stroke={isBookmarked ? 'var(--accent)' : 'var(--text-muted)'}
                  strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {/* Continuous text */}
          <div className="bijbel-text">
            {verses.map((v) => {
              const isExpanded = expandedVerse === v.id;
              return (
                <span key={v.id}>
                  <span
                    className={`bijbel-verse ${isExpanded ? 'bijbel-verse-active' : ''}`}
                    onClick={() => {
                      const sel = window.getSelection();
                      if (sel && sel.toString().length > 0) return;
                      toggleVerse(v.id);
                    }}
                  >
                    <sup className="bijbel-vnum">{v.verse}</sup>
                    {v.text_sv}
                    {verseMarkers[v.id]?.length > 0 && (
                      <span className="verse-markers">
                        {verseMarkers[v.id].map((m, i) => (
                          <sup key={i} className="verse-marker-sup">{m}</sup>
                        ))}
                      </span>
                    )}
                  </span>
                  {isExpanded && (
                    <div className="verse-detail bijbel-detail">
                      {detailLoading ? (
                        <div className="loader"><div className="spinner" /></div>
                      ) : (
                        <>
                          {kanttekeningen.length > 0 && (
                            <div className="detail-section">
                              <div className="detail-section-title">Kanttekeningen</div>
                              {kanttekeningen.map((k) => (
                                <div key={k.id} className="kanttekening-item">
                                  {k.marker && <span className="kant-marker">{k.marker}</span>}
                                  <span className="kant-text">{expandInlineRefs(k.note_text)}</span>
                                  <button
                                    className={`detail-bm-btn ${isDetailBookmarked(k.id) ? 'active' : ''}`}
                                    onClick={(e) => { e.stopPropagation(); toggleDetailBookmark('kanttekening', k.id, k.note_text || '', 'Kanttekening'); }}
                                    title="Bladwijzer"
                                  >
                                    <svg width="14" height="14" viewBox="0 0 20 20" fill={isDetailBookmarked(k.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
                                      <path d="M5 3C5 2.44772 5.44772 2 6 2H14C14.5523 2 15 2.44772 15 3V17.5L10 14L5 17.5V3Z" />
                                    </svg>
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {commentaries.length > 0 && (
                            <div className="detail-section">
                              <div className="detail-section-title">
                                Verklaringen ({commentaries.length})
                              </div>
                              {commentaries.map((c) => {
                                const isOpen = expandedCommentary[c.id];
                                const text = c.commentary_text || '';
                                const preview = truncate(text, 200);
                                const authorName = c.authors?.name || 'Onbekend';
                                const years = c.authors?.born_year
                                  ? `${c.authors.born_year}\u2013${c.authors.died_year || '?'}`
                                  : '';

                                return (
                                  <div
                                    key={c.id}
                                    className="commentary-card"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleCommentary(c.id);
                                    }}
                                  >
                                    <div className="commentary-header">
                                      <span className="author-name">{authorName}</span>
                                      {years && <span className="author-years">{years}</span>}
                                      {c.year_written && (
                                        <span className="year-badge">{c.year_written}</span>
                                      )}
                                      <button
                                        className={`detail-bm-btn ${isDetailBookmarked(c.id) ? 'active' : ''}`}
                                        onClick={(e) => { e.stopPropagation(); toggleDetailBookmark('verklaring', c.id, text, authorName); }}
                                        title="Bladwijzer"
                                      >
                                        <svg width="14" height="14" viewBox="0 0 20 20" fill={isDetailBookmarked(c.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
                                          <path d="M5 3C5 2.44772 5.44772 2 6 2H14C14.5523 2 15 2.44772 15 3V17.5L10 14L5 17.5V3Z" />
                                        </svg>
                                      </button>
                                    </div>
                                    <div className="commentary-text">
                                      {expandInlineRefs(isOpen ? text : preview)}
                                    </div>
                                    {text.length > 200 && (
                                      <div className="expand-hint">
                                        {isOpen ? 'Inklappen \u25B2' : 'Lees meer \u25BC'}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {crossRefs.length > 0 && (
                            <div className="detail-section">
                              <div className="detail-section-title">Kruisverwijzingen ({crossRefs.length})</div>
                              <div className="cross-refs-list">
                                {crossRefs.map((cr) => {
                                  const tv = cr.to_verse;
                                  if (!tv) return null;
                                  const book = tv.bible_books;
                                  const identifier = book?.name || '';
                                  const ref = `${displayBookName(book?.name ?? '')} ${tv.chapter}:${tv.verse}`;
                                  const crPreview = truncate(tv.text_sv, 120);
                                  return (
                                    <Link
                                      key={cr.id}
                                      to={`/zoeken?q=${encodeURIComponent(`${identifier} ${tv.chapter}:${tv.verse}`)}`}
                                      className="cross-ref-item"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <span className="cross-ref-ref">{ref}</span>
                                      <span className="cross-ref-preview">{crPreview}</span>
                                      <span className="cross-ref-votes">{cr.votes}</span>
                                    </Link>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {sermons.length > 0 && (
                            <div className="detail-section">
                              <div className="detail-section-title">Andere verwijzingen ({sermons.length})</div>
                              {sermons.map((s) => {
                                const isOpen = expandedSermon[s.id];
                                const sAuthor = s.authors?.name || 'Onbekend';
                                const snippet = truncate(s.sermon_text, 250);
                                return (
                                  <div key={s.id} className="sermon-ref-card">
                                    <div
                                      className="sermon-ref-header"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setExpandedSermon((prev) => ({ ...prev, [s.id]: !prev[s.id] }));
                                      }}
                                    >
                                      <div>
                                        <span className="author-name">{sAuthor}</span>
                                        {s.source_collection && <span className="sermon-ref-collection">{s.source_collection}</span>}
                                      </div>
                                      <span className="sermon-ref-arrow">{isOpen ? '\u25B2' : '\u25BC'}</span>
                                    </div>
                                    <div className="sermon-ref-title">{s.title}</div>
                                    {isOpen && (
                                      <div
                                        className="sermon-ref-snippet"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navigate(`/preek/${s.id}`);
                                        }}
                                      >
                                        <p className="sermon-ref-text">{snippet}</p>
                                        <span className="sermon-ref-link">Lees de volledige preek &#9656;</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {kanttekeningen.length === 0 && commentaries.length === 0 && crossRefs.length === 0 && sermons.length === 0 && (
                            <div className="empty-text">Geen kanttekeningen, verklaringen of kruisverwijzingen voor dit vers.</div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                  {' '}
                </span>
              );
            })}
          </div>

          {/* Page footer with chapter nav */}
          <div className="bl-page-foot">
            <span className="bl-foot-rule" />
            <div className="bl-foot-nav">
              {chapterNum > 1 && (
                <button className="bl-foot-btn" onClick={() => goChapter(chapterNum - 1)}>
                  {'\u2039'} Hoofdstuk {chapterNum - 1}
                </button>
              )}
              <span className="bl-page-num">{bookName} {chapter}</span>
              {chapterNum < chapterCount && (
                <button className="bl-foot-btn" onClick={() => goChapter(chapterNum + 1)}>
                  Hoofdstuk {chapterNum + 1} {'\u203A'}
                </button>
              )}
            </div>
            <span className="bl-foot-rule" />
          </div>
        </div>
        <SelectionPopup verseRef={`${bookName} ${chapter}`} />
      </div>
    </>
  );
}
