import { useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import PremiumGate from '../components/PremiumGate';
import { truncate } from '../lib/truncate';
import { displayBookName } from '../lib/parseReference';
import useDocumentTitle from '../hooks/useDocumentTitle';

interface PvBookmark {
  ref: string;
  query: string;
  ts: number;
}

interface BelBookmark {
  slug: string;
  articleNumber: number;
  title: string;
  ts: number;
}

interface CatBookmark {
  questionNumber: number;
  lordDay: number | null;
  questionText: string;
  ts: number;
}

interface BlBookmark {
  page: number;
  label: string;
  ts: number;
  authorId?: string;
  authorName?: string;
}

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
  ts: number;
  sourceUrl?: string;
}

const PV_KEY = 'si-pv-bookmarks';
const BEL_KEY = 'si-bel-bookmarks';
const BL_KEY = 'bl-bookmarks';
const CAT_KEY = 'si-cat-bookmarks';
const BB_KEY = 'si-bijbel-bookmarks';
const DETAIL_KEY = 'si-detail-bookmarks';

function loadPv(): PvBookmark[] {
  try { return JSON.parse(localStorage.getItem(PV_KEY) || '[]'); } catch { return []; }
}
function loadBel(): BelBookmark[] {
  try { return JSON.parse(localStorage.getItem(BEL_KEY) || '[]'); } catch { return []; }
}
function loadCat(): CatBookmark[] {
  try { return JSON.parse(localStorage.getItem(CAT_KEY) || '[]'); } catch { return []; }
}
function loadBl(): BlBookmark[] {
  try { return JSON.parse(localStorage.getItem(BL_KEY) || '[]').filter((b: BlBookmark) => b.authorId); } catch { return []; }
}
function loadBb(): BijbelBookmark[] {
  try { return JSON.parse(localStorage.getItem(BB_KEY) || '[]'); } catch { return []; }
}
function loadDetail(): DetailBookmark[] {
  try { return JSON.parse(localStorage.getItem(DETAIL_KEY) || '[]'); } catch { return []; }
}

const SLUG_LABELS: Record<string, string> = {
  ngb: 'Nederlandse Geloofsbelijdenis',
  dl: 'Dordtse Leerregels',
};

export default function Bladwijzers() {
  useDocumentTitle('Bladwijzers');
  const [pvBookmarks, setPvBookmarks] = useState<PvBookmark[]>(loadPv);
  const [belBookmarks, setBelBookmarks] = useState<BelBookmark[]>(loadBel);
  const [catBookmarks, setCatBookmarks] = useState<CatBookmark[]>(loadCat);
  const [blBookmarks, setBlBookmarks] = useState<BlBookmark[]>(loadBl);
  const [bbBookmarks, setBbBookmarks] = useState<BijbelBookmark[]>(loadBb);
  const [detailBookmarks, setDetailBookmarks] = useState<DetailBookmark[]>(loadDetail);

  const removePv = (ref: string) => {
    const updated = pvBookmarks.filter(b => b.ref !== ref);
    setPvBookmarks(updated);
    localStorage.setItem(PV_KEY, JSON.stringify(updated));
  };

  const removeBel = (slug: string, articleNumber: number) => {
    const updated = belBookmarks.filter(b => !(b.slug === slug && b.articleNumber === articleNumber));
    setBelBookmarks(updated);
    localStorage.setItem(BEL_KEY, JSON.stringify(updated));
  };

  const removeCat = (questionNumber: number) => {
    const updated = catBookmarks.filter(b => b.questionNumber !== questionNumber);
    setCatBookmarks(updated);
    localStorage.setItem(CAT_KEY, JSON.stringify(updated));
  };

  const removeBl = (authorId: string, page: number) => {
    const all: BlBookmark[] = JSON.parse(localStorage.getItem(BL_KEY) || '[]');
    const updated = all.filter(b => !(b.authorId === authorId && b.page === page));
    localStorage.setItem(BL_KEY, JSON.stringify(updated));
    setBlBookmarks(updated.filter(b => b.authorId));
  };

  const removeBb = (bookId: string, chapter: number) => {
    const updated = bbBookmarks.filter(b => !(b.bookId === bookId && b.chapter === chapter));
    setBbBookmarks(updated);
    localStorage.setItem(BB_KEY, JSON.stringify(updated));
  };

  const removeDetail = (id: string) => {
    const updated = detailBookmarks.filter(b => b.id !== id);
    setDetailBookmarks(updated);
    localStorage.setItem(DETAIL_KEY, JSON.stringify(updated));
  };

  const isEmpty = pvBookmarks.length === 0 && belBookmarks.length === 0 && catBookmarks.length === 0 && blBookmarks.length === 0 && bbBookmarks.length === 0 && detailBookmarks.length === 0;

  return (
    <>
      <div className="screen-header">
        <h1>Bladwijzers</h1>
      </div>
      <div className="page">
        <Logo />
        <PremiumGate feature="Bladwijzers">
        {isEmpty && (
          <div className="pv-empty">
            <div className="pv-empty-icon">
              <svg width="48" height="48" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 3C5 2.44772 5.44772 2 6 2H14C14.5523 2 15 2.44772 15 3V17.5L10 14L5 17.5V3Z"
                  stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" fill="none" />
              </svg>
            </div>
            <p>Nog geen bladwijzers opgeslagen.</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>
              Sla teksten op vanuit de preekvoorbereiding, belijdenisgeschriften of boeklezer om ze hier terug te vinden.
            </p>
          </div>
        )}

        {bbBookmarks.length > 0 && (
          <div className="bw-section">
            <h2 className="bw-section-title">Bijbel</h2>
            <div className="bw-list">
              {bbBookmarks.sort((a, b) => b.ts - a.ts).map(b => (
                <div key={`${b.bookId}-${b.chapter}`} className="bw-item">
                  <Link to={`/bijbel/${b.bookId}/${b.chapter}?name=${encodeURIComponent(b.bookName)}`} className="bw-link">
                    <span className="bw-ref">{displayBookName(b.bookName)} {b.chapter}</span>
                    <span className="bw-date">{new Date(b.ts).toLocaleDateString('nl-NL')}</span>
                  </Link>
                  <button className="bw-rm" onClick={() => removeBb(b.bookId, b.chapter)} title="Verwijderen">{'\u00D7'}</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {detailBookmarks.length > 0 && (
          <div className="bw-section">
            <h2 className="bw-section-title">Verklaringen &amp; Kanttekeningen</h2>
            <div className="bw-list">
              {detailBookmarks.sort((a, b) => b.ts - a.ts).map(b => (
                <div key={b.id} className="bw-item">
                  <Link to={b.sourceUrl || `/zoeken?q=${encodeURIComponent(b.verseRef)}`} className="bw-link">
                    <span className="bw-ref">{b.verseRef} · {b.authorName}</span>
                    <span className="bw-meta">{truncate(b.text, 80)}</span>
                  </Link>
                  <button className="bw-rm" onClick={() => removeDetail(b.id)} title="Verwijderen">{'\u00D7'}</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {pvBookmarks.length > 0 && (
          <div className="bw-section">
            <h2 className="bw-section-title">Preekvoorbereiding</h2>
            <div className="bw-list">
              {pvBookmarks.map(b => (
                <div key={b.ref} className="bw-item">
                  <Link to={`/preekvoorbereiding?q=${encodeURIComponent(b.query)}`} className="bw-link">
                    <span className="bw-ref">{b.ref}</span>
                    <span className="bw-date">{new Date(b.ts).toLocaleDateString('nl-NL')}</span>
                  </Link>
                  <button className="bw-rm" onClick={() => removePv(b.ref)} title="Verwijderen">{'\u00D7'}</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {belBookmarks.length > 0 && (
          <div className="bw-section">
            <h2 className="bw-section-title">Belijdenisgeschriften</h2>
            <div className="bw-list">
              {belBookmarks.map(b => (
                <div key={`${b.slug}-${b.articleNumber}`} className="bw-item">
                  <Link to={`/belijdenis/${b.slug}`} className="bw-link">
                    <span className="bw-ref">{b.title || `Artikel ${b.articleNumber}`}</span>
                    <span className="bw-meta">{SLUG_LABELS[b.slug] || b.slug}</span>
                  </Link>
                  <button className="bw-rm" onClick={() => removeBel(b.slug, b.articleNumber)} title="Verwijderen">{'\u00D7'}</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {catBookmarks.length > 0 && (
          <div className="bw-section">
            <h2 className="bw-section-title">Catechismus</h2>
            <div className="bw-list">
              {catBookmarks.map(b => (
                <div key={b.questionNumber} className="bw-item">
                  <Link to="/catechismus" className="bw-link">
                    <span className="bw-ref">Vraag {b.questionNumber}{b.lordDay ? ` \u00B7 Zondag ${b.lordDay}` : ''}</span>
                    <span className="bw-meta">{truncate(b.questionText, 60)}</span>
                  </Link>
                  <button className="bw-rm" onClick={() => removeCat(b.questionNumber)} title="Verwijderen">{'\u00D7'}</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {blBookmarks.length > 0 && (
          <div className="bw-section">
            <h2 className="bw-section-title">Boeklezer</h2>
            <div className="bw-list">
              {blBookmarks.sort((a, b) => b.ts - a.ts).map(b => (
                <div key={`${b.authorId}-${b.page}`} className="bw-item">
                  <Link to={`/boeklezer/${b.authorId}?page=${b.page + 1}`} className="bw-link">
                    <span className="bw-ref">{b.label}</span>
                    <span className="bw-meta">{b.authorName || 'Onbekend'} · p.{b.page + 1}</span>
                  </Link>
                  <button className="bw-rm" onClick={() => removeBl(b.authorId!, b.page)} title="Verwijderen">{'\u00D7'}</button>
                </div>
              ))}
            </div>
          </div>
        )}
        </PremiumGate>
      </div>
    </>
  );
}
