import { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Logo from '../components/Logo';
import { parseReference, formatRef, getSuggestions, displayBookName, expandInlineRefs } from '../lib/parseReference';
import type { BibleVerse, Kanttekening } from '../types/database';
import { truncate } from '../lib/truncate';
import SelectionPopup from '../components/SelectionPopup';
import { useVoiceSearch } from '../hooks/useVoiceSearch';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { ERA_COLORS, type CommentaryWithAuthor } from '../lib/constants';
import { getStorage, setStorage } from '../lib/storage';

interface CrossRefRow {
  id: string; votes: number; to_verse_end_id: string | null;
  to_verse: { id: string; book_id: string; chapter: number; verse: number; text_sv: string; bible_books: { name: string; abbreviation: string } };
}
interface SermonRow {
  id: string; title: string; sermon_text: string; source_collection: string | null;
  year_preached: number | null; language: string;
  authors: { name: string; born_year: number | null; died_year: number | null; era: string | null } | null;
}
interface CatechismLink {
  question_number: number;
  lord_day: number | null;
  question_text: string;
  answer_text: string;
}

const NOTES_KEY = 'si-pv-notes';
const BOOKMARKS_KEY = 'si-pv-bookmarks';

type Tab = 'verklaringen' | 'kanttekeningen' | 'kruisverwijzingen' | 'preken' | 'catechismus' | 'notities';

const ERA_ORDER = ['Reformatie', 'Nadere Reformatie', 'Puriteinse periode', '19e eeuw', 'Kerkvaders'];

interface Bookmark {
  ref: string;
  query: string;
  ts: number;
}

function loadNotes(): Record<string, string> {
  return getStorage<Record<string, string>>(NOTES_KEY, {});
}
function loadBookmarks(): Bookmark[] {
  return getStorage<Bookmark[]>(BOOKMARKS_KEY, []);
}

export default function Preekvoorbereiding() {
  useDocumentTitle('Preekvoorbereiding');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [commentaries, setCommentaries] = useState<CommentaryWithAuthor[]>([]);
  const [kanttekeningen, setKanttekeningen] = useState<Kanttekening[]>([]);
  const [crossRefs, setCrossRefs] = useState<CrossRefRow[]>([]);
  const [sermons, setSermons] = useState<SermonRow[]>([]);
  const [catechismLinks, setCatechismLinks] = useState<CatechismLink[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('verklaringen');
  const [expandedComm, setExpandedComm] = useState<Record<string, boolean>>({});
  const [expandedSermon, setExpandedSermon] = useState<Record<string, boolean>>({});
  const [refLabel, setRefLabel] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>(loadNotes);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(loadBookmarks);
  const [detailBookmarks, setDetailBookmarks] = useState<{ type: string; id: string; text: string; authorName: string; verseRef: string; ts: number }[]>(() =>
    getStorage<{ type: string; id: string; text: string; authorName: string; verseRef: string; ts: number }[]>('si-detail-bookmarks', [])
  );
  const [showSuggestions, setShowSuggestions] = useState(false);
  const voice = useVoiceSearch((text) => { setQuery(text); });

  const currentNote = notes[refLabel] || '';
  const isBookmarked = bookmarks.some(b => b.ref === refLabel);

  // Selectie → notities: voeg geselecteerde tekst toe aan notities met referentie
  useEffect(() => {
    const handleSelection = () => {
      if (!refLabel) return;
      const sel = window.getSelection();
      if (!sel || sel.toString().trim().length < 10) return;
      const selectedText = sel.toString().trim();
      // Check of selectie binnen een verklaring/preek/kanttekening is
      const anchor = sel.anchorNode?.parentElement?.closest('.pv-comm-card, .pv-sermon-card, .kanttekening-item');
      if (!anchor) return;
      const authorEl = anchor.querySelector('.author-name');
      const authorName = authorEl?.textContent || '';
      const noteAddition = `\n\n--- ${authorName ? authorName + ': ' : ''}${refLabel} ---\n"${selectedText}"`;
      const existing = notes[refLabel] || '';
      const updated = { ...notes, [refLabel]: existing + noteAddition };
      setNotes(updated);
      setStorage(NOTES_KEY, updated);
    };

    document.addEventListener('mouseup', handleSelection);
    return () => document.removeEventListener('mouseup', handleSelection);
  }, [refLabel, notes]);

  const updateNote = (text: string) => {
    const updated = { ...notes, [refLabel]: text };
    if (!text.trim()) delete updated[refLabel];
    setNotes(updated);
    setStorage(NOTES_KEY, updated);
  };

  const toggleBookmark = () => {
    let updated: Bookmark[];
    if (isBookmarked) {
      updated = bookmarks.filter(b => b.ref !== refLabel);
    } else {
      updated = [{ ref: refLabel, query: query.trim(), ts: Date.now() }, ...bookmarks];
    }
    setBookmarks(updated);
    setStorage(BOOKMARKS_KEY, updated);
  };

  const removeBookmark = (ref: string) => {
    const updated = bookmarks.filter(b => b.ref !== ref);
    setBookmarks(updated);
    setStorage(BOOKMARKS_KEY, updated);
  };

  // Autocomplete
  const suggestions = query.trim() ? getSuggestions(query, 5) : [];

  const search = useCallback(async () => {
    const ref = parseReference(query);
    if (!ref) {
      setError('Voer een tekst in, bijv. "Rom 8:28-30", "psalm 23 vers 1 tot 6"');
      return;
    }

    setLoading(true); setError(null); setExpandedComm({}); setExpandedSermon({});
    setRefLabel(formatRef(ref));

    try {
      const { data: books } = await supabase.from('bible_books').select('id').eq('name', ref.book).limit(1);
      if (!books?.length) { setError(`Boek "${ref.book}" niet gevonden.`); setLoading(false); return; }
      const bookId = books[0].id;

      const { data: vData } = await supabase.from('bible_verses')
        .select('*, bible_books(name, abbreviation)')
        .eq('book_id', bookId)
        .eq('chapter', ref.chapter)
        .gte('verse', ref.verseStart)
        .lte('verse', ref.verseEnd)
        .order('verse', { ascending: true });

      if (!vData?.length) { setError('Geen verzen gevonden voor deze referentie.'); setLoading(false); return; }
      setVerses(vData as BibleVerse[]);

      const verseIds = vData.map(v => v.id);

      // Also fetch all verse IDs for the chapter (for sermon range matching)
      const { data: chapterVerses } = await supabase.from('bible_verses')
        .select('id, verse')
        .eq('book_id', bookId)
        .eq('chapter', ref.chapter)
        .order('verse', { ascending: true });

      const chapterVerseIds = (chapterVerses || []).map(v => v.id);

      // Fetch all data in parallel
      const [commRes, kantRes, crossRes, sermonRes, catRes] = await Promise.all([
        supabase.from('commentaries')
          .select('*, authors(name, born_year, died_year, era)')
          .in('verse_id', verseIds)
          .neq('scope', 'book')
          .order('year_written', { ascending: true }),
        supabase.from('kanttekeningen').select('*')
          .in('verse_id', verseIds).order('note_order', { ascending: true }),
        supabase.from('cross_references')
          .select('id, votes, to_verse_end_id, to_verse:bible_verses!to_verse_id(id, book_id, chapter, verse, text_sv, bible_books(name, abbreviation))')
          .in('from_verse_id', verseIds).order('votes', { ascending: false }).limit(30),
        // Sermons: match any sermon whose start_verse_id is in this chapter
        // (we filter client-side for overlap with selected range)
        chapterVerseIds.length > 0
          ? supabase.from('sermons')
              .select('id, title, sermon_text, source_collection, year_preached, language, start_verse_id, end_verse_id, authors(name, born_year, died_year, era)')
              .in('start_verse_id', chapterVerseIds)
              .order('year_preached', { ascending: true })
              .limit(50)
          : Promise.resolve({ data: [] }),
        supabase.from('catechism_proof_texts')
          .select('note, catechism_questions(question_number, lord_day, question_text, answer_text)')
          .in('verse_id', verseIds),
      ]);

      // Deduplicate commentaries per author per verse
      const allComm = (commRes.data || []) as CommentaryWithAuthor[];
      const seen = new Map<string, CommentaryWithAuthor>();
      for (const c of allComm) {
        const key = `${c.author_id}-${c.verse_id}`;
        const existing = seen.get(key);
        if (!existing || (c.scope === 'verse' && existing.scope !== 'verse')) {
          seen.set(key, c);
        }
      }
      const deduped = Array.from(seen.values());
      // Sorteer op vers-volgorde, niet op jaar
      deduped.sort((a, b) => {
        const va = vData.find(v => v.id === a.verse_id);
        const vb = vData.find(v => v.id === b.verse_id);
        return (va?.verse ?? 0) - (vb?.verse ?? 0);
      });

      // Filter sermons: keep those whose range overlaps with selected verses
      const verseIdSet = new Set(verseIds);
      const allSermons = (sermonRes.data || []) as any[];
      const matchingSermons = allSermons.filter((s: any) => {
        // If start_verse_id is in our selection, it's a match
        if (verseIdSet.has(s.start_verse_id)) return true;
        // If sermon has end_verse_id and start is in this chapter, check overlap
        if (s.end_verse_id) {
          const startIdx = chapterVerseIds.indexOf(s.start_verse_id);
          const endIdx = chapterVerseIds.indexOf(s.end_verse_id);
          if (startIdx >= 0 && endIdx >= 0) {
            const sermonVerseIds = new Set(chapterVerseIds.slice(startIdx, endIdx + 1));
            return verseIds.some(vid => sermonVerseIds.has(vid));
          }
        }
        return false;
      });

      setCommentaries(deduped);
      setKanttekeningen(kantRes.data || []);
      setCrossRefs((crossRes.data || []) as unknown as CrossRefRow[]);
      setSermons(matchingSermons as SermonRow[]);

      // Extract catechism links (deduplicated)
      const catLinks: CatechismLink[] = [];
      const seenQ = new Set<number>();
      for (const row of (catRes.data || []) as any[]) {
        const q = row.catechism_questions;
        if (q && !seenQ.has(q.question_number)) {
          seenQ.add(q.question_number);
          catLinks.push(q);
        }
      }
      catLinks.sort((a, b) => a.question_number - b.question_number);
      setCatechismLinks(catLinks);

      setActiveTab('verklaringen');
    } catch (err) {
      console.error('Preekvoorbereiding search error:', err);
      setError('Fout bij het zoeken: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  }, [query]);

  // Auto-search from example click
  useEffect(() => {
    if (query && !verses.length && !loading && !error) {
      const ref = parseReference(query);
      if (ref) search();
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { search(); setShowSuggestions(false); }
    if (e.key === 'Escape') setShowSuggestions(false);
  };

  // Group commentaries by era
  const commByEra = new Map<string, Map<string, CommentaryWithAuthor[]>>();
  for (const c of commentaries) {
    const era = c.authors?.era || 'Overig';
    const name = c.authors?.name || 'Onbekend';
    if (!commByEra.has(era)) commByEra.set(era, new Map());
    const eraMap = commByEra.get(era)!;
    if (!eraMap.has(name)) eraMap.set(name, []);
    eraMap.get(name)!.push(c);
  }

  const sortedEras = Array.from(commByEra.keys()).sort((a, b) => {
    const ai = ERA_ORDER.indexOf(a);
    const bi = ERA_ORDER.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'verklaringen', label: 'Verklaringen', count: commentaries.length },
    { key: 'preken', label: 'Preken', count: sermons.length },
    { key: 'kanttekeningen', label: 'Kanttekeningen', count: kanttekeningen.length },
    { key: 'kruisverwijzingen', label: 'Kruisverwijzingen', count: crossRefs.length },
    { key: 'catechismus', label: 'Catechismus', count: catechismLinks.length },
    { key: 'notities', label: 'Notities', count: currentNote.trim() ? 1 : 0 },
  ];

  return (
    <>
      <div className="screen-header">
        <h1>Preekvoorbereiding</h1>
      </div>
      <div className="page pv-page">
        <Logo />

        <div className="search-bar-wrap">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Bijv. romeinen 8 vers 28 tot 30"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); }}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowSuggestions(true)}
              autoComplete="off"
            />
            <div className="search-actions">
              {query && (
                <button className="search-action-btn search-clear" onClick={() => setQuery('')} title="Wissen" type="button">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
              {voice.supported && (
                <button
                  className={`search-action-btn search-voice${voice.listening ? ' search-voice-active' : ''}`}
                  onClick={voice.toggle}
                  title="Spraakherkenning"
                  type="button"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8" y1="23" x2="16" y2="23"/>
                  </svg>
                </button>
              )}
              <button className="search-submit-btn" onClick={() => { search(); setShowSuggestions(false); }} type="button">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/>
                </svg>
              </button>
            </div>
          </div>
          {showSuggestions && suggestions.length > 0 && (
            <div className="ac-dropdown">
              {suggestions.map((s) => (
                <div key={s} className="ac-item" onMouseDown={() => { setQuery(s + ' '); setShowSuggestions(false); }}>
                  <span className="ac-icon">{'\u25C8'}</span>
                  <span className="ac-label">{s}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bladwijzers — altijd zichtbaar als er items zijn en geen resultaten */}
        {bookmarks.length > 0 && verses.length === 0 && !loading && (
          <div className="pv-bookmarks">
            <div className="pv-bm-title">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{verticalAlign: 'middle', marginRight: 6}}>
                <path d="M5 3C5 2.44772 5.44772 2 6 2H14C14.5523 2 15 2.44772 15 3V17.5L10 14L5 17.5V3Z"
                  fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
              Bladwijzers
            </div>
            <div className="pv-bm-list">
              {bookmarks.map(b => (
                <div key={b.ref} className="pv-bm-item">
                  <span className="pv-bm-ref" onClick={() => { setQuery(b.query); }}>{b.ref}</span>
                  <button className="pv-bm-rm" onClick={() => removeBookmark(b.ref)} title="Verwijderen">{'\u00D7'}</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Demo/instructie als geen resultaten */}
        {verses.length === 0 && !loading && !error && bookmarks.length === 0 && (
          <div className="pv-demo">
            <h3 className="pv-demo-title">Zo werkt het</h3>
            <div className="pv-demo-steps">
              <div className="pv-demo-step">
                <span className="pv-demo-num">1</span>
                <div>
                  <strong>Voer uw preektekst in</strong>
                  <p>Typ een bijbelverwijzing, bijv. <em>Romeinen 8:28-30</em> of <em>psalm 23 vers 1 tot 6</em>.</p>
                </div>
              </div>
              <div className="pv-demo-step">
                <span className="pv-demo-num">2</span>
                <div>
                  <strong>Verken de verklaringen</strong>
                  <p>U ontvangt alle beschikbare oudvader-verklaringen, kanttekeningen, kruisverwijzingen en preken bij uw tekst.</p>
                </div>
              </div>
              <div className="pv-demo-step">
                <span className="pv-demo-num">3</span>
                <div>
                  <strong>Markeer en bewaar</strong>
                  <p>Selecteer tekst uit een verklaring om het automatisch op te slaan in uw notities, inclusief bronvermelding.</p>
                </div>
              </div>
              <div className="pv-demo-step">
                <span className="pv-demo-num">4</span>
                <div>
                  <strong>Maak aantekeningen</strong>
                  <p>Gebruik het tabblad Notities om uw eigen gedachten en preekopbouw vast te leggen bij de tekst.</p>
                </div>
              </div>
            </div>
            <div className="pv-demo-try">
              <span>Probeer het:</span>
              {['Rom 8:28', 'Psalm 23:1-3', 'Joh 3:16'].map(ref => (
                <button key={ref} className="pv-demo-chip" onClick={() => { setQuery(ref); }}>{ref}</button>
              ))}
            </div>
          </div>
        )}

        {loading && <div className="loader"><div className="spinner" /></div>}
        {error && <div className="error-box">{error}</div>}

        {verses.length > 0 && !loading && (
          <>
            <div className="pv-verse-block">
              <div className="pv-verse-top">
                <span className="pv-ref">{refLabel}</span>
                <button
                  className={`pv-bm-btn ${isBookmarked ? 'active' : ''}`}
                  onClick={toggleBookmark}
                  title={isBookmarked ? 'Bladwijzer verwijderen' : 'Bladwijzer toevoegen'}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 3C5 2.44772 5.44772 2 6 2H14C14.5523 2 15 2.44772 15 3V17.5L10 14L5 17.5V3Z"
                      fill={isBookmarked ? 'currentColor' : 'none'}
                      stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
              {verses.map(v => (
                <p key={v.id} className="pv-verse-line">
                  <sup className="pv-verse-num">{v.verse}</sup> {v.text_sv}
                </p>
              ))}
            </div>

            <button className="export-btn" onClick={() => window.print()}>
              {'\u2399'} Exporteer / Print
            </button>

            <div className="pv-tabs">
              {tabs.map(t => (
                <button
                  key={t.key}
                  className={`pv-tab ${activeTab === t.key ? 'active' : ''}`}
                  onClick={() => setActiveTab(t.key)}
                >
                  <span>{t.label}</span>
                  {t.count > 0 && <span className="pv-tab-count">{t.count}</span>}
                </button>
              ))}
            </div>

            <div className="pv-content">

              {/* ── Verklaringen per tijdperk ── */}
              {activeTab === 'verklaringen' && (
                commentaries.length === 0 ? (
                  <div className="empty-text">Geen verklaringen gevonden.</div>
                ) : (
                  sortedEras.map(era => {
                    const authors = commByEra.get(era)!;
                    const color = ERA_COLORS[era] || 'var(--text-faint)';
                    return (
                      <div key={era} className="pv-era-group">
                        <div className="pv-era-header" style={{ borderLeftColor: color }}>
                          <span className="pv-era-name" style={{ color }}>{era}</span>
                        </div>
                        {Array.from(authors.entries()).map(([authorName, comms]) => {
                          const auth = comms[0].authors;
                          const years = auth?.born_year ? `${auth.born_year}\u2013${auth.died_year || '?'}` : '';
                          return (
                            <div key={authorName} className="pv-author-group">
                              <div className="pv-author-header">
                                <span className="author-name">{authorName}</span>
                                {years && <span className="author-years">{years}</span>}
                              </div>
                              {comms.map(c => {
                                const isOpen = expandedComm[c.id];
                                const text = c.commentary_text || '';
                                const preview = truncate(text, 300);
                                const v = verses.find(vv => vv.id === c.verse_id);
                                const vLabel = v ? `vs. ${v.verse}` : '';
                                return (
                                  <div key={c.id} className="pv-comm-card" onClick={() => setExpandedComm(prev => ({ ...prev, [c.id]: !prev[c.id] }))}>
                                    <div className="pv-comm-top">
                                      {vLabel && <span className="pv-comm-verse-label">{vLabel}</span>}
                                      <button
                                        className={`detail-bm-btn ${detailBookmarks.some(b => b.id === c.id) ? 'active' : ''}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const exists = detailBookmarks.some(b => b.id === c.id);
                                          const updated = exists
                                            ? detailBookmarks.filter(b => b.id !== c.id)
                                            : [{ type: 'verklaring' as const, id: c.id, text: text.slice(0, 200), authorName, verseRef: refLabel, sourceUrl: `/preekvoorbereiding?q=${encodeURIComponent(refLabel)}`, ts: Date.now() }, ...detailBookmarks];
                                          setDetailBookmarks(updated);
                                          setStorage('si-detail-bookmarks', updated);
                                        }}
                                        title="Bladwijzer"
                                      >
                                        <svg width="14" height="14" viewBox="0 0 20 20" fill={detailBookmarks.some(b => b.id === c.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
                                          <path d="M5 3C5 2.44772 5.44772 2 6 2H14C14.5523 2 15 2.44772 15 3V17.5L10 14L5 17.5V3Z" />
                                        </svg>
                                      </button>
                                    </div>
                                    <div className="commentary-text">{expandInlineRefs(isOpen ? text : preview)}</div>
                                    {text.length > 300 && (
                                      <div className="expand-hint">{isOpen ? 'Inklappen \u25B2' : 'Lees meer \u25BC'}</div>
                                    )}
                                    <Link to={`/boeklezer/${c.author_id}?commentaryId=${c.id}&verseId=${c.verse_id}`}
                                      className="bl-read-link" onClick={e => e.stopPropagation()}>
                                      Lees in boekvorm →
                                    </Link>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })
                )
              )}

              {/* ── Preken ── */}
              {activeTab === 'preken' && (
                sermons.length === 0 ? (
                  <div className="empty-text">Geen preken gevonden bij deze tekst.</div>
                ) : (
                  sermons.map(s => {
                    const isOpen = expandedSermon[s.id];
                    const text = s.sermon_text || '';
                    const preview = truncate(text, 400);
                    const authorName = s.authors?.name || 'Onbekend';
                    const years = s.authors?.born_year ? `${s.authors.born_year}\u2013${s.authors.died_year || '?'}` : '';
                    return (
                      <div key={s.id} className="pv-sermon-card" onClick={() => setExpandedSermon(prev => ({ ...prev, [s.id]: !prev[s.id] }))}>
                        <div className="pv-sermon-header">
                          <span className="pv-sermon-title">{s.title}</span>
                          {s.year_preached && <span className="year-badge">{s.year_preached}</span>}
                        </div>
                        <div className="pv-sermon-meta">
                          <span className="author-name">{authorName}</span>
                          {years && <span className="author-years">{years}</span>}
                          {s.source_collection && <span className="pv-sermon-source">{s.source_collection}</span>}
                        </div>
                        <div className="commentary-text">{expandInlineRefs(isOpen ? text : preview)}</div>
                        {text.length > 400 && (
                          <div className="expand-hint">{isOpen ? 'Inklappen \u25B2' : 'Lees meer \u25BC'}</div>
                        )}
                      </div>
                    );
                  })
                )
              )}

              {/* ── Kanttekeningen ── */}
              {activeTab === 'kanttekeningen' && (
                kanttekeningen.length === 0 ? (
                  <div className="empty-text">Geen kanttekeningen gevonden.</div>
                ) : (
                  <div className="pv-kant-list">
                    {kanttekeningen.map(k => {
                      const v = verses.find(vv => vv.id === k.verse_id);
                      return (
                        <div key={k.id} className="kanttekening-item">
                          {v && <span className="pv-kant-verse">vs. {v.verse}</span>}
                          {k.marker && <span className="kant-marker">{k.marker}</span>}
                          <span className="kant-text">{expandInlineRefs(k.note_text)}</span>
                        </div>
                      );
                    })}
                  </div>
                )
              )}

              {/* ── Kruisverwijzingen ── */}
              {activeTab === 'kruisverwijzingen' && (
                crossRefs.length === 0 ? (
                  <div className="empty-text">Geen kruisverwijzingen gevonden.</div>
                ) : (
                  <div className="cross-refs-list">
                    {crossRefs.map(cr => {
                      const tv = cr.to_verse;
                      if (!tv) return null;
                      const book = tv.bible_books;
                      const identifier = book?.name || '';
                      const cref = `${displayBookName(book?.name ?? '')} ${tv.chapter}:${tv.verse}`;
                      const preview = truncate(tv.text_sv, 120);
                      return (
                        <Link key={cr.id} to={`/zoeken?q=${encodeURIComponent(`${identifier} ${tv.chapter}:${tv.verse}`)}`} className="cross-ref-item">
                          <span className="cross-ref-ref">{cref}</span>
                          <span className="cross-ref-preview">{preview}</span>
                          <span className="cross-ref-votes">{cr.votes}</span>
                        </Link>
                      );
                    })}
                  </div>
                )
              )}

              {/* ── Catechismus koppelingen ── */}
              {activeTab === 'catechismus' && (
                catechismLinks.length === 0 ? (
                  <div className="empty-text">Geen catechismus-koppelingen gevonden voor deze tekst.</div>
                ) : (
                  <div className="pv-cat-list">
                    <p className="pv-cat-intro">Deze tekst wordt als bewijsplaats aangehaald bij de volgende vragen uit de Heidelbergse Catechismus:</p>
                    {catechismLinks.map(q => (
                      <div key={q.question_number} className="pv-cat-card">
                        <div className="pv-cat-header">
                          <span className="pv-cat-num">Vraag {q.question_number}</span>
                          {q.lord_day && <span className="pv-cat-ld">Zondag {q.lord_day}</span>}
                        </div>
                        <div className="pv-cat-q">{q.question_text}</div>
                        <div className="pv-cat-a">{q.answer_text}</div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {/* ── Notities ── */}
              {activeTab === 'notities' && (
                <div className="pv-notes">
                  <p className="pv-notes-hint">Uw aantekeningen bij {refLabel}. Deze worden lokaal opgeslagen op dit apparaat.</p>
                  <textarea
                    className="pv-notes-area"
                    placeholder="Typ hier uw preeknotities, gedachten en observaties..."
                    value={currentNote}
                    onChange={(e) => updateNote(e.target.value)}
                    rows={12}
                  />
                  {Object.keys(notes).length > 1 && (
                    <div className="pv-notes-other">
                      <span className="pv-notes-other-title">Eerdere notities:</span>
                      {Object.entries(notes).filter(([ref]) => ref !== refLabel && notes[ref]?.trim()).map(([ref, text]) => (
                        <div key={ref} className="pv-notes-other-item" onClick={() => { setQuery(ref); }}>
                          <span className="pv-notes-other-ref">{ref}</span>
                          <span className="pv-notes-other-preview">{truncate(text, 60)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        <SelectionPopup verseRef={refLabel} />

      </div>
    </>
  );
}
