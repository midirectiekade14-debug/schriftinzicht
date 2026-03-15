import { useEffect, useState, useCallback } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { BibleVerse, Kanttekening, Commentary } from '../types/database';

interface CommentaryWithAuthor extends Omit<Commentary, 'authors'> {
  authors: { name: string; born_year: number | null; died_year: number | null } | null;
}

interface CrossRefRow {
  id: string;
  votes: number;
  to_verse_end_id: string | null;
  to_verse: { id: string; book_id: string; chapter: number; verse: number; text_sv: string; bible_books: { name: string; abbreviation: string } };
}

export default function Verzen() {
  const { bookId, chapter } = useParams();
  const [searchParams] = useSearchParams();
  const bookName = searchParams.get('name') || 'Boek';
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedVerse, setExpandedVerse] = useState<string | null>(null);
  const [kanttekeningen, setKanttekeningen] = useState<Kanttekening[]>([]);
  const [commentaries, setCommentaries] = useState<CommentaryWithAuthor[]>([]);
  const [crossRefs, setCrossRefs] = useState<CrossRefRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [expandedCommentary, setExpandedCommentary] = useState<Record<string, boolean>>({});

  useEffect(() => {
    supabase
      .from('bible_verses')
      .select('*')
      .eq('book_id', bookId!)
      .eq('chapter', parseInt(chapter!, 10))
      .order('verse', { ascending: true })
      .then(({ data }) => {
        setVerses(data || []);
        setLoading(false);
      });
  }, [bookId, chapter]);

  const toggleVerse = useCallback(async (verseId: string) => {
    if (expandedVerse === verseId) {
      setExpandedVerse(null);
      return;
    }

    setExpandedVerse(verseId);
    setDetailLoading(true);
    setExpandedCommentary({});

    const [kantRes, commRes, crossRes] = await Promise.all([
      supabase
        .from('kanttekeningen')
        .select('*')
        .eq('verse_id', verseId)
        .order('note_order', { ascending: true }),
      supabase
        .from('commentaries')
        .select('*, authors(name, born_year, died_year)')
        .eq('verse_id', verseId)
        .order('year_written', { ascending: true }),
      supabase
        .from('cross_references')
        .select('id, votes, to_verse_end_id, to_verse:bible_verses!to_verse_id(id, book_id, chapter, verse, text_sv, bible_books(name, abbreviation))')
        .eq('from_verse_id', verseId)
        .order('votes', { ascending: false })
        .limit(15),
    ]);

    setKanttekeningen(kantRes.data || []);
    setCommentaries((commRes.data || []) as CommentaryWithAuthor[]);
    setCrossRefs((crossRes.data || []) as unknown as CrossRefRow[]);
    setDetailLoading(false);
  }, [expandedVerse]);

  const toggleCommentary = (id: string) => {
    setExpandedCommentary((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) {
    return (
      <>
        <div className="screen-header">
          <Link to={`/bijbel/${bookId}?name=${encodeURIComponent(bookName)}&chapters=999`} className="back-link">&lsaquo; {bookName}</Link>
          <h1>{bookName} {chapter}</h1>
        </div>
        <div className="page"><div className="loader"><div className="spinner" /></div></div>
      </>
    );
  }

  return (
    <>
      <div className="screen-header">
        <Link to={`/bijbel/${bookId}?name=${encodeURIComponent(bookName)}&chapters=999`} className="back-link">&lsaquo; {bookName}</Link>
        <h1>{bookName} {chapter}</h1>
      </div>
      <div className="page">
        {verses.map((v) => {
          const isExpanded = expandedVerse === v.id;

          return (
            <div key={v.id}>
              <div
                className={`verse-row ${isExpanded ? 'verse-row-active' : ''}`}
                onClick={() => toggleVerse(v.id)}
              >
                <span className="verse-num">{v.verse}</span>
                <span className="verse-text">{v.text_sv}</span>
              </div>

              {isExpanded && (
                <div className="verse-detail">
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
                              <span className="kant-text">{k.note_text}</span>
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
                            const preview = text.length > 200 ? text.slice(0, 200) + '...' : text;
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
                                </div>
                                <div className="commentary-text">
                                  {isOpen ? text : preview}
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
                              const identifier = book?.abbreviation || book?.name || '';
                              const ref = `${book?.name ?? ''} ${tv.chapter}:${tv.verse}`;
                              const preview = tv.text_sv.length > 120 ? tv.text_sv.slice(0, 120) + '\u2026' : tv.text_sv;
                              return (
                                <Link
                                  key={cr.id}
                                  to={`/zoeken?q=${encodeURIComponent(`${identifier} ${tv.chapter}:${tv.verse}`)}`}
                                  className="cross-ref-item"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <span className="cross-ref-ref">{ref}</span>
                                  <span className="cross-ref-preview">{preview}</span>
                                  <span className="cross-ref-votes">{cr.votes}</span>
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {kanttekeningen.length === 0 && commentaries.length === 0 && crossRefs.length === 0 && (
                        <div className="empty-text">Geen kanttekeningen, verklaringen of kruisverwijzingen voor dit vers.</div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
