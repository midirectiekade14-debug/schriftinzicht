import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { truncate } from '../lib/truncate';
import { useAuth } from '../hooks/useAuth';

interface PvBookmark { ref: string; query: string; ts: number }
interface BlBookmark { page: number; label: string; ts: number; authorId?: string; authorName?: string }
interface BijbelBookmark { bookId: string; bookName: string; chapter: number; ts: number }

const PV_KEY = 'si-pv-bookmarks';
const BL_KEY = 'bl-bookmarks';
const BB_KEY = 'si-bijbel-bookmarks';
const NOTES_KEY = 'si-pv-notes';
const HISTORY_KEY = 'bl-history';
const SEARCH_HISTORY_KEY = 'si-search-history';

export default function AppSidebar() {
  const { isLoggedIn } = useAuth();
  const [pvBm, setPvBm] = useState<PvBookmark[]>([]);
  const [blBm, setBlBm] = useState<BlBookmark[]>([]);
  const [bbBm, setBbBm] = useState<BijbelBookmark[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<{ authorId: string; name: string }[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  useEffect(() => {
    const load = () => {
      try { setPvBm(JSON.parse(localStorage.getItem(PV_KEY) || '[]')); } catch { /* */ }
      try { setBlBm(JSON.parse(localStorage.getItem(BL_KEY) || '[]').filter((b: BlBookmark) => b.authorId)); } catch { /* */ }
      try { setBbBm(JSON.parse(localStorage.getItem(BB_KEY) || '[]')); } catch { /* */ }
      try { setNotes(JSON.parse(localStorage.getItem(NOTES_KEY) || '{}')); } catch { /* */ }
      try { setHistory(JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')); } catch { /* */ }
      try { setSearchHistory(JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]')); } catch { /* */ }
    };
    load();
    window.addEventListener('storage', load);
    window.addEventListener('focus', load);
    return () => { window.removeEventListener('storage', load); window.removeEventListener('focus', load); };
  }, []);

  const noteEntries = Object.entries(notes).filter(([, v]) => v?.trim());

  if (!isLoggedIn) {
    return (
      <aside className="app-sidebar">
        <div className="as-section" style={{ textAlign: 'center', padding: '24px 12px' }}>
          <p style={{ fontSize: 13, color: 'var(--text-faint)', marginBottom: 8 }}>
            Log in om bladwijzers, aantekeningen en zoekgeschiedenis te bewaren.
          </p>
          <Link to="/inloggen" style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
            Inloggen
          </Link>
        </div>
      </aside>
    );
  }

  return (
    <aside className="app-sidebar">
      {/* Bladwijzers — altijd zichtbaar */}
      <div className="as-section as-section-sticky">
        <div className="as-title">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" style={{verticalAlign: 'middle', marginRight: 4}}>
            <path d="M5 3C5 2.44772 5.44772 2 6 2H14C14.5523 2 15 2.44772 15 3V17.5L10 14L5 17.5V3Z" />
          </svg>
          Bladwijzers
        </div>
        {pvBm.length === 0 && blBm.length === 0 && bbBm.length === 0 ? (
          <div className="as-empty">
            <span style={{ fontSize: 13 }}>Nog geen bladwijzers</span>
            <span style={{ fontSize: 12, color: 'var(--text-faint)', display: 'block', marginTop: 4 }}>
              Sla bijbelhoofdstukken of verklaringen op via het bladwijzer-icoon.
            </span>
          </div>
        ) : (
          <>
            {bbBm.map((b, i) => (
              <div key={`bb-${b.bookId}-${b.chapter}`} className="as-item-row">
                <Link to={`/bijbel/${b.bookId}/${b.chapter}?name=${encodeURIComponent(b.bookName)}`} className="as-item">
                  {b.bookName} {b.chapter}
                </Link>
                <button className="as-rm" onClick={() => {
                  const updated = bbBm.filter((_, j) => j !== i);
                  setBbBm(updated);
                  localStorage.setItem(BB_KEY, JSON.stringify(updated));
                }}>{'\u2715'}</button>
              </div>
            ))}
            {pvBm.slice(0, 8).map((b, i) => (
              <div key={b.ref} className="as-item-row">
                <Link to={`/preekvoorbereiding?q=${encodeURIComponent(b.query)}`} className="as-item">
                  {b.ref}
                </Link>
                <button className="as-rm" onClick={() => {
                  const updated = pvBm.filter((_, j) => j !== i);
                  setPvBm(updated);
                  localStorage.setItem(PV_KEY, JSON.stringify(updated));
                }}>{'\u2715'}</button>
              </div>
            ))}
            {blBm.slice(0, 5).map((b, i) => (
              <div key={`${b.authorId}-${b.page}`} className="as-item-row">
                <Link to={`/boeklezer/${b.authorId}?page=${b.page + 1}`} className="as-item">
                  {b.label}
                </Link>
                <button className="as-rm" onClick={() => {
                  const updated = blBm.filter((_, j) => j !== i);
                  setBlBm(updated);
                  localStorage.setItem(BL_KEY, JSON.stringify(updated));
                }}>{'\u2715'}</button>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Aantekeningen */}
      <div className="as-section">
        <div className="as-title">Aantekeningen</div>
        {noteEntries.length === 0 ? (
          <div className="as-empty">
            <span style={{ fontSize: 13 }}>Geen notities</span>
            <span style={{ fontSize: 12, color: 'var(--text-faint)', display: 'block', marginTop: 4 }}>
              Selecteer tekst bij de preekvoorbereiding om notities te maken.
            </span>
          </div>
        ) : (
          noteEntries.slice(0, 8).map(([ref, text]) => (
            <Link key={ref} to={`/zoeken?q=${encodeURIComponent(ref)}`} className="as-note" style={{ textDecoration: 'none', color: 'inherit' }}>
              <span className="as-note-ref">{ref}</span>
              <span className="as-note-preview">{truncate(text, 50)}</span>
            </Link>
          ))
        )}
      </div>

      {/* Zoekgeschiedenis */}
      {searchHistory.length > 0 && (
        <div className="as-section">
          <div className="as-title">Zoekgeschiedenis</div>
          {searchHistory.slice(0, 8).map((q, i) => (
            <Link key={i} to={`/zoeken?q=${encodeURIComponent(q)}`} className="as-item">
              {q}
            </Link>
          ))}
        </div>
      )}

      {/* Recent gelezen */}
      {history.length > 0 && (
        <div className="as-section">
          <div className="as-title">Recent gelezen</div>
          {history.slice(0, 6).map((h, i) => (
            <div key={i} className="as-item-row">
              <Link to={`/boeklezer/${h.authorId}`} className="as-item">
                {h.name}
              </Link>
              <button className="as-rm" onClick={() => {
                const updated = history.filter((_, j) => j !== i);
                setHistory(updated);
                localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
              }}>{'\u2715'}</button>
            </div>
          ))}
        </div>
      )}

    </aside>
  );
}
