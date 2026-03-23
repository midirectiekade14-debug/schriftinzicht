import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { truncate } from '../lib/truncate';

interface Article {
  id: string;
  article_number: number;
  title: string | null;
  article_text: string;
  chapter: string | null;
}

const SLUG_TITLES: Record<string, string> = {
  ngb: 'Nederlandse Geloofsbelijdenis',
  dl: 'Dordtse Leerregels',
};

const BM_KEY = 'si-bel-bookmarks';

interface Bookmark {
  slug: string;
  articleNum: number;
  title: string;
  ts: number;
}

function loadBookmarks(): Bookmark[] {
  try { return JSON.parse(localStorage.getItem(BM_KEY) || '[]'); } catch { return []; }
}

export default function BelijdenisDetail() {
  const { slug } = useParams();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(loadBookmarks);
  const title = SLUG_TITLES[slug || ''] || 'Belijdenis';

  useEffect(() => {
    if (!slug) return;
    setLoading(true);

    const SLUG_IDS: Record<string, number> = { ngb: 2, dl: 3 };
    const confessionId = SLUG_IDS[slug];
    if (!confessionId) { setLoading(false); return; }

    supabase
      .from('confession_articles')
      .select('id, article_number, title, article_text, chapter')
      .eq('confession_id', confessionId)
      .order('article_number', { ascending: true })
      .then(({ data, error: err }) => {
        if (err) { setError('Kon artikelen niet laden.'); setLoading(false); return; }
        setArticles(
          (data || []).map(d => ({
            id: String(d.id),
            article_number: d.article_number,
            title: d.title,
            article_text: d.article_text,
            chapter: d.chapter,
          }))
        );
        setLoading(false);
      });
  }, [slug]);

  const toggleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const isBookmarked = (articleNum: number) =>
    bookmarks.some(b => b.slug === slug && b.articleNum === articleNum);

  const toggleBookmark = (articleNum: number, articleTitle: string) => {
    let updated: Bookmark[];
    if (isBookmarked(articleNum)) {
      updated = bookmarks.filter(b => !(b.slug === slug && b.articleNum === articleNum));
    } else {
      updated = [
        { slug: slug || '', articleNum, title: articleTitle || `Artikel ${articleNum}`, ts: Date.now() },
        ...bookmarks,
      ];
    }
    setBookmarks(updated);
    localStorage.setItem(BM_KEY, JSON.stringify(updated));
  };

  if (loading) {
    return (
      <>
        <div className="screen-header">
          <Link to="/belijdenissen" className="back-link">&lsaquo; Belijdenissen</Link>
          <h1>{title}</h1>
        </div>
        <div className="page"><div className="loader"><div className="spinner" /></div></div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className="screen-header">
          <Link to="/belijdenissen" className="back-link">&lsaquo; Belijdenissen</Link>
          <h1>{title}</h1>
        </div>
        <div className="page"><div className="error-box">{error}</div></div>
      </>
    );
  }

  // Bookmarks for current confession
  const myBookmarks = bookmarks.filter(b => b.slug === slug);

  return (
    <>
      <div className="screen-header">
        <Link to="/belijdenissen" className="back-link">&lsaquo; Belijdenissen</Link>
        <h1>{title}</h1>
      </div>
      <div className="page">
        {/* Bladwijzers */}
        {myBookmarks.length > 0 && (
          <div className="bel-bm-bar">
            <span className="bel-bm-label">Bladwijzers:</span>
            {myBookmarks.map(b => (
              <button
                key={b.articleNum}
                className="bel-bm-chip"
                onClick={() => {
                  const el = document.getElementById(`art-${b.articleNum}`);
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    setExpanded(prev => ({ ...prev, [articles.find(a => a.article_number === b.articleNum)?.id || '']: true }));
                  }
                }}
              >
                Art. {b.articleNum}
              </button>
            ))}
          </div>
        )}

        {articles.length === 0 ? (
          <div className="empty-text">Geen artikelen gevonden.</div>
        ) : (() => {
          // Group by chapter for DL, flat list for NGB
          const chapters = slug === 'dl'
            ? [...new Set(articles.map(a => a.chapter).filter(Boolean))] as string[]
            : null;

          const renderArticle = (a: Article) => {
            const isOpen = expanded[a.id];
            const preview = truncate(a.article_text, 250);
            const marked = isBookmarked(a.article_number);
            return (
              <div key={a.id} id={`art-${a.article_number}`} className="bel-article">
                <div className="bel-article-top">
                  <div>
                    <div className="bel-article-num">{a.title || `Artikel ${a.article_number}`}</div>
                  </div>
                  <button
                    className={`pv-bm-btn ${marked ? 'active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); toggleBookmark(a.article_number, a.title || ''); }}
                    title={marked ? 'Bladwijzer verwijderen' : 'Bladwijzer toevoegen'}
                  >
                    <svg width="18" height="18" viewBox="0 0 20 20" fill={marked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
                      <path d="M5 3C5 2.44772 5.44772 2 6 2H14C14.5523 2 15 2.44772 15 3V17.5L10 14L5 17.5V3Z" />
                    </svg>
                  </button>
                </div>
                <div className="bel-article-text" data-edit-table="confession_articles" data-edit-id={a.id} data-edit-col="article_text" data-edit-label={a.title || `Artikel ${a.article_number}`} onClick={() => toggleExpand(a.id)}>
                  {isOpen ? a.article_text : preview}
                </div>
                {a.article_text.length > 250 && (
                  <div className="expand-hint" onClick={() => toggleExpand(a.id)}>
                    {isOpen ? 'Inklappen \u25B2' : 'Lees meer \u25BC'}
                  </div>
                )}
              </div>
            );
          };

          if (chapters) {
            return chapters.map(ch => (
              <div key={ch} className="bel-chapter">
                <div className="bel-chapter-title">Hoofdstuk {ch}</div>
                {articles.filter(a => a.chapter === ch).map(renderArticle)}
              </div>
            ));
          }
          return articles.map(renderArticle);
        })()}
      </div>
    </>
  );
}
