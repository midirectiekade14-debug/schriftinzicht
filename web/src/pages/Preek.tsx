import { useEffect, useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { displayBookName } from '../lib/parseReference';

interface SermonDetail {
  id: string;
  title: string;
  sermon_text: string;
  source_collection: string | null;
  year_preached: number | null;
  word_count: number | null;
  author_id: string;
  authors: {
    name: string;
    born_year: number | null;
    died_year: number | null;
  } | null;
  start_verse: {
    chapter: number;
    verse: number;
    bible_books: { name: string } | null;
  } | null;
}

interface SiblingSermon {
  id: string;
  title: string;
}

const CHARS_PER_PAGE = 2400;

function cleanTitle(t: string): string {
  let s = t.replace(/^\d+[\.\)]\s*/, '');
  if (s.length > 5 && s === s.toUpperCase()) {
    s = s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  }
  return s;
}

export default function Preek() {
  const { id } = useParams();
  const [sermon, setSermon] = useState<SermonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [prevSermon, setPrevSermon] = useState<SiblingSermon | null>(null);
  const [nextSermon, setNextSermon] = useState<SiblingSermon | null>(null);

  useEffect(() => {
    setLoading(true);
    setCurrentPage(0);
    supabase
      .from('sermons')
      .select('id, title, sermon_text, source_collection, year_preached, word_count, author_id, authors(name, born_year, died_year), start_verse:bible_verses!start_verse_id(chapter, verse, bible_books(name))')
      .eq('id', id!)
      .single()
      .then(({ data }) => {
        const s = data as unknown as SermonDetail;
        setSermon(s);
        setLoading(false);

        // Fetch prev/next from same author
        if (s?.author_id) {
          supabase
            .from('sermons')
            .select('id, title')
            .eq('author_id', s.author_id)
            .lt('id', s.id)
            .order('id', { ascending: false })
            .limit(1)
            .then(({ data: prev }) => setPrevSermon(prev?.[0] as SiblingSermon || null));

          supabase
            .from('sermons')
            .select('id, title')
            .eq('author_id', s.author_id)
            .gt('id', s.id)
            .order('id', { ascending: true })
            .limit(1)
            .then(({ data: next }) => setNextSermon(next?.[0] as SiblingSermon || null));
        }
      });
  }, [id]);

  // Paginate sermon text
  const pages = useMemo(() => {
    if (!sermon) return [];
    const text = sermon.sermon_text || '';
    const paragraphs = text.split('\n').filter(p => p.trim());
    const result: string[][] = [];
    let curPage: string[] = [];
    let curLen = 0;

    for (const para of paragraphs) {
      if (curLen > 0 && curLen + para.length > CHARS_PER_PAGE) {
        result.push(curPage);
        curPage = [];
        curLen = 0;
      }
      curPage.push(para);
      curLen += para.length;
    }
    if (curPage.length > 0) result.push(curPage);
    return result;
  }, [sermon]);

  const totalPages = pages.length;

  const goPage = (p: number) => {
    if (p >= 0 && p < totalPages) {
      setCurrentPage(p);
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  if (loading) {
    return (
      <>
        <div className="screen-header">
          <span className="back-link" onClick={() => window.history.back()}>&lsaquo; Terug</span>
          <h1>Laden</h1>
        </div>
        <div className="page"><div className="loader"><div className="spinner" /></div></div>
      </>
    );
  }

  if (!sermon) {
    return (
      <>
        <div className="screen-header"><h1>Niet gevonden</h1></div>
        <div className="page"><div className="empty-text">Tekst niet gevonden.</div></div>
      </>
    );
  }

  const authorName = sermon.authors?.name || 'Onbekend';
  const years = sermon.authors?.born_year
    ? `${sermon.authors.born_year}\u2013${sermon.authors.died_year || '?'}`
    : '';
  const verseRef = sermon.start_verse
    ? `${displayBookName(sermon.start_verse.bible_books?.name || '')} ${sermon.start_verse.chapter}:${sermon.start_verse.verse}`
    : '';

  const pageContent = pages[currentPage] || [];

  return (
    <>
      <div className="screen-header">
        <span className="back-link" onClick={() => window.history.back()}>&lsaquo; Terug</span>
        <h1>{authorName}</h1>
      </div>
      <div className="page">
        <div className="bijbel-page">
          {/* Page header */}
          <div className="bl-page-head">
            <span className="bl-head-rule" />
            <span className="bl-head-title">{authorName}</span>
            <span className="bl-head-rule" />
          </div>

          {/* Title only on first page */}
          {currentPage === 0 && (
            <div className="preek-header">
              <h2 className="preek-title">{cleanTitle(sermon.title)}</h2>
              <div className="preek-meta">
                {years && <span className="preek-years">{years}</span>}
                {verseRef && <span className="preek-badge">{verseRef}</span>}
                {sermon.source_collection && <span className="preek-badge">{sermon.source_collection}</span>}
              </div>
            </div>
          )}

          {/* Content */}
          <div className="bijbel-text">
            {pageContent.map((p, i) => (
              <p key={i} className="bl-paragraph">{p}</p>
            ))}
          </div>

          {/* Page footer */}
          <div className="bl-page-foot">
            <span className="bl-foot-rule" />
            <div className="bl-foot-nav">
              {currentPage > 0 && (
                <button className="bl-foot-btn" onClick={() => goPage(currentPage - 1)}>
                  {'\u2039'} Vorige
                </button>
              )}
              <span className="bl-page-num">
                {totalPages > 1 ? `${currentPage + 1} / ${totalPages}` : ''}
              </span>
              {currentPage < totalPages - 1 && (
                <button className="bl-foot-btn" onClick={() => goPage(currentPage + 1)}>
                  Volgende {'\u203A'}
                </button>
              )}
            </div>
            <span className="bl-foot-rule" />
          </div>

          {/* Prev/next sermon navigation — only on last page */}
          {currentPage === totalPages - 1 && (prevSermon || nextSermon) && (
            <div className="preek-nav">
              {prevSermon ? (
                <Link to={`/preek/${prevSermon.id}`} className="preek-nav-btn">
                  {'\u2039'} {cleanTitle(prevSermon.title).substring(0, 40)}
                </Link>
              ) : <span />}
              {nextSermon ? (
                <Link to={`/preek/${nextSermon.id}`} className="preek-nav-btn">
                  {cleanTitle(nextSermon.title).substring(0, 40)} {'\u203A'}
                </Link>
              ) : <span />}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
