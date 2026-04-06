import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { parseReference, formatRef, getSuggestions, navigateRef, displayBookName, expandInlineRefs, type BibleRef } from '../lib/parseReference';
import type { BibleVerse, Kanttekening } from '../types/database';
import Logo from '../components/Logo';
import SelectionPopup from '../components/SelectionPopup';
import { truncate } from '../lib/truncate';
import { useVoiceSearch } from '../hooks/useVoiceSearch';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { ERA_COLORS, type CommentaryWithAuthor } from '../lib/constants';
import { getStorage, setStorage } from '../lib/storage';

/** Split commentary text into readable paragraphs.
 *  Priority: double newlines > single newlines > sentence-based splitting for long blocks. */
function splitIntoParagraphs(text: string): string[] {
  // Try double newlines first
  const doubleNl = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  if (doubleNl.length > 1) return doubleNl;

  // Try single newlines (many entries use these as paragraph breaks)
  const singleNl = text.split(/\n/).map(p => p.trim()).filter(Boolean);
  if (singleNl.length > 1) return singleNl;

  // No newlines at all — split long text on sentence boundaries (~400 chars)
  if (text.length < 600) return [text];

  const result: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= 500) {
      result.push(remaining);
      break;
    }
    // Find a sentence end (. ! ?) between char 250–500
    let splitIdx = -1;
    for (let i = Math.min(500, remaining.length - 1); i >= 250; i--) {
      if (/[.!?]/.test(remaining[i]) && (i + 1 >= remaining.length || remaining[i + 1] === ' ')) {
        splitIdx = i + 1;
        break;
      }
    }
    if (splitIdx === -1) splitIdx = Math.min(500, remaining.length);
    result.push(remaining.substring(0, splitIdx).trim());
    remaining = remaining.substring(splitIdx).trim();
  }
  return result;
}

interface CrossRefRow {
  id: string;
  votes: number;
  to_verse_end_id: string | null;
  to_verse: { id: string; book_id: string; chapter: number; verse: number; text_sv: string; bible_books: { name: string; abbreviation: string } };
}

interface DailyVerse {
  ref: string;
  text: string;
  authorName: string;
  commentary: string;
  fullCommentary: string;
}

const DAILY_CACHE_KEY = 'si-daily-verse';

function getCachedDaily(): DailyVerse | null {
  try {
    const raw = localStorage.getItem(DAILY_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    const today = new Date().toISOString().slice(0, 10);
    if (cached.date === today) return cached.data;
  } catch { /* ignore */ }
  return null;
}

function useDailyVerse() {
  const [daily, setDaily] = useState<DailyVerse | null>(getCachedDaily);
  useEffect(() => {
    // Al gecached voor vandaag? Dan klaar.
    if (daily) return;
    (async () => {
      try {
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 0);
      const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000);
      let { data: comms } = await supabase
        .from('commentaries')
        .select('verse_id, commentary_text, authors(name)')
        .not('commentary_text', 'is', null)
        .neq('commentary_text', '')
        .eq('language', 'nl')
        .limit(200);
      if (!comms?.length) {
        const fallback = await supabase
          .from('commentaries')
          .select('verse_id, commentary_text, authors(name)')
          .not('commentary_text', 'is', null)
          .neq('commentary_text', '')
          .limit(200);
        comms = fallback.data;
      }
      if (!comms?.length) return;
      const validComms = comms.filter((c: any) => c.commentary_text?.trim().length > 10);
      if (!validComms.length) return;
      const pick = validComms[dayOfYear % validComms.length] as any;
      const { data: mainVerse } = await supabase
        .from('bible_verses')
        .select('text_sv, chapter, verse, book_id, bible_books(name, abbreviation)')
        .eq('id', pick.verse_id)
        .limit(1);
      if (!mainVerse?.length) return;
      const v = mainVerse[0] as any;
      // Haal 2 extra verzen op voor context (vers-1 t/m vers+1)
      const { data: contextVerses } = await supabase
        .from('bible_verses')
        .select('verse, text_sv')
        .eq('book_id', v.book_id)
        .eq('chapter', v.chapter)
        .gte('verse', Math.max(1, v.verse - 1))
        .lte('verse', v.verse + 1)
        .order('verse', { ascending: true });
      const combinedText = (contextVerses || [mainVerse[0]])
        .map((cv: any) => cv.text_sv).join(' ');
      const bookName = displayBookName(v.bible_books?.name || v.bible_books?.abbreviation || '');
      const startV = contextVerses?.length ? contextVerses[0].verse : v.verse;
      const endV = contextVerses?.length ? contextVerses[contextVerses.length - 1].verse : v.verse;
      const refStr = startV === endV ? `${bookName} ${v.chapter}:${v.verse}` : `${bookName} ${v.chapter}:${startV}\u2013${endV}`;
      const fullText = (pick.commentary_text || '').trim();
      const result: DailyVerse = {
        ref: refStr,
        text: combinedText,
        authorName: pick.authors?.name || '',
        commentary: truncate(fullText, 250),
        fullCommentary: fullText,
      };
      setDaily(result);
      localStorage.setItem(DAILY_CACHE_KEY, JSON.stringify({
        date: now.toISOString().slice(0, 10),
        data: result,
      }));
      } catch {
        // Dagvers is niet kritiek
      }
    })();
  }, []);
  return daily;
}


const POPULAR_THEMES = [
  { label: 'Genade', query: 'genade' },
  { label: 'Geloof', query: 'geloof' },
  { label: 'Verkiezing', query: 'verkiezing' },
  { label: 'Verbond', query: 'verbond' },
  { label: 'Bekering', query: 'bekering' },
  { label: 'Troost', query: 'troost' },
  { label: 'Gebed', query: 'gebed' },
  { label: 'Lijden', query: 'lijden' },
];

const HISTORY_KEY = 'si-search-history';
const SAVED_KEY = 'si-saved-verses';
const DETAIL_BM_KEY = 'si-detail-bookmarks';
const MAX_HISTORY = 15;

interface SavedVerse {
  ref: string;
  verseId: string;
  text: string;
  ts: number;
}

function loadHistory(): string[] {
  return getStorage<string[]>(HISTORY_KEY, []);
}
function saveHistory(list: string[]) {
  setStorage(HISTORY_KEY, list.slice(0, MAX_HISTORY));
}
function loadSaved(): SavedVerse[] {
  return getStorage<SavedVerse[]>(SAVED_KEY, []);
}
function saveSavedList(list: SavedVerse[]) {
  setStorage(SAVED_KEY, list);
}

// Cache book name → id lookups to avoid repeated queries
const bookIdCache = new Map<string, string>();

// In-memory search result cache (TTL 5 min)
const CACHE_TTL = 5 * 60 * 1000;
const searchCache = new Map<string, { data: any; ts: number }>();

function getCached(key: string) {
  const entry = searchCache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  searchCache.delete(key);
  return null;
}

function setCache(key: string, data: any) {
  searchCache.set(key, { data, ts: Date.now() });
  // Limit cache size
  if (searchCache.size > 50) {
    const oldest = searchCache.keys().next().value;
    if (oldest) searchCache.delete(oldest);
  }
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

function loadDetailBookmarks(): DetailBookmark[] {
  return getStorage<DetailBookmark[]>(DETAIL_BM_KEY, []);
}


export default function Zoeken() {
  useDocumentTitle('Zoeken');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [textResults, setTextResults] = useState<BibleVerse[]>([]);
  const [textTotal, setTextTotal] = useState(0);
  const [textCollapsed, setTextCollapsed] = useState<Record<string, boolean>>({});
  const [textCommentaries, setTextCommentaries] = useState<CommentaryWithAuthor[]>([]);
  const [textCommTotal, setTextCommTotal] = useState(0);
  const [textSermons, setTextSermons] = useState<any[]>([]);
  const [textSermonTotal, setTextSermonTotal] = useState(0);
  const [textTab, setTextTab] = useState<'bijbel' | 'verklaringen' | 'preken'>('bijbel');
  const [commentaries, setCommentaries] = useState<CommentaryWithAuthor[]>([]);
  const [kanttekeningen, setKanttekeningen] = useState<Kanttekening[]>([]);
  const [crossRefs, setCrossRefs] = useState<CrossRefRow[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>(loadHistory);
  const [saved, setSaved] = useState<SavedVerse[]>(loadSaved);
  const [showSaved, setShowSaved] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [dailyExpanded, setDailyExpanded] = useState(false);
  const [refLabel, setRefLabel] = useState('');
  const [currentRef, setCurrentRef] = useState<BibleRef | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1);
  const [detailBookmarks, setDetailBookmarks] = useState<DetailBookmark[]>(loadDetailBookmarks);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const dailyVerse = useDailyVerse();
  const voice = useVoiceSearch((text) => { setQuery(text); setTimeout(() => searchWithQuery(text), 0); });

  const isDetailBookmarked = (id: string) => detailBookmarks.some(b => b.id === id);

  const toggleDetailBookmark = (type: 'kanttekening' | 'verklaring', id: string, text: string, authorName: string) => {
    let updated: DetailBookmark[];
    if (isDetailBookmarked(id)) {
      updated = detailBookmarks.filter(b => b.id !== id);
    } else {
      const sourceUrl = `/zoeken?q=${encodeURIComponent(refLabel)}`;
      updated = [{ type, id, text: text.slice(0, 200), authorName, verseRef: refLabel, sourceUrl, ts: Date.now() }, ...detailBookmarks];
    }
    setDetailBookmarks(updated);
    setStorage(DETAIL_BM_KEY, updated);
  };

  // Autofill suggestions
  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    // Combine book suggestions with matching history
    const bookSugs = getSuggestions(query, 5);
    const historySugs = history
      .filter(h => h.toLowerCase().startsWith(query.toLowerCase()) && h.toLowerCase() !== query.toLowerCase())
      .slice(0, 3);
    // Merge: history first, then books (no duplicates)
    const merged: { label: string; type: 'history' | 'book' }[] = [];
    for (const h of historySugs) merged.push({ label: h, type: 'history' });
    for (const b of bookSugs) {
      if (!merged.some(m => m.label === b)) merged.push({ label: b, type: 'book' });
    }
    return merged.slice(0, 7);
  }, [query, history]);

  useEffect(() => {
    const prefill = searchParams.get('q');
    if (prefill && prefill !== query) setQuery(prefill);
  }, [searchParams]);

  useEffect(() => {
    const prefill = searchParams.get('q');
    if (prefill && query === prefill && query) search();
  }, [query, searchParams]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const addToHistory = (q: string) => {
    const updated = [q, ...history.filter(h => h.toLowerCase() !== q.toLowerCase())].slice(0, MAX_HISTORY);
    setHistory(updated);
    saveHistory(updated);
  };

  const removeFromHistory = (q: string) => {
    const updated = history.filter(h => h !== q);
    setHistory(updated);
    saveHistory(updated);
  };

  const clearHistory = () => { setHistory([]); saveHistory([]); };

  const isSaved = (verseId: string) => saved.some(s => s.verseId === verseId);

  const toggleSave = (verseId: string, ref: string, text: string) => {
    const updated = isSaved(verseId)
      ? saved.filter(s => s.verseId !== verseId)
      : [{ ref, verseId, text, ts: Date.now() }, ...saved];
    setSaved(updated);
    saveSavedList(updated);
  };

  const removeSaved = (verseId: string) => {
    const updated = saved.filter(s => s.verseId !== verseId);
    setSaved(updated);
    saveSavedList(updated);
  };

  const searchWithQuery = useCallback(async (q: string) => {
    const ref = parseReference(q);

    // Text search fallback when not a verse reference
    if (!ref) {
      if (q.trim().length < 2) {
        setError('Voer minimaal 2 tekens in om te zoeken.');
        return;
      }
      setLoading(true); setError(null); setShowSuggestions(false);
      setVerses([]); setCommentaries([]); setKanttekeningen([]); setCrossRefs([]); setTextResults([]); setTextTotal(0); setTextCollapsed({}); setTextCommentaries([]); setTextCommTotal(0); setTextSermons([]); setTextSermonTotal(0); setTextTab('bijbel');
      addToHistory(q.trim());

      // Check cache first
      const cacheKey = `text:${q.trim().toLowerCase()}`;
      const cached = getCached(cacheKey);
      if (cached) {
        setTextTotal(cached.textTotal); setTextResults(cached.textResults);
        setTextCommTotal(cached.textCommTotal); setTextCommentaries(cached.textCommentaries);
        setTextSermonTotal(cached.textSermonTotal); setTextSermons(cached.textSermons);
        setTextTab(cached.textTab);
        if (!cached.textResults.length && !cached.textCommentaries.length && !cached.textSermons.length) {
          setError(`Geen resultaten gevonden voor "${q.trim()}".`);
        }
        setLoading(false);
        return;
      }

      try {
        // Parallel: count+fetch verses, commentaries, sermons
        const [verseCount, versesRes, commCount, commRes, sermonCount, sermonRes] = await Promise.all([
          supabase
            .from('bible_verses')
            .select('id', { count: 'exact', head: true })
            .ilike('text_sv', `%${q.trim()}%`),
          supabase
            .from('bible_verses')
            .select('*, bible_books(name, abbreviation, testament, book_order)')
            .ilike('text_sv', `%${q.trim()}%`)
            .order('book_id')
            .order('chapter')
            .order('verse')
            .limit(500),
          supabase
            .from('commentaries')
            .select('id', { count: 'exact', head: true })
            .ilike('commentary_text', `%${q.trim()}%`),
          supabase
            .from('commentaries')
            .select('*, authors(name, born_year, died_year, era)')
            .ilike('commentary_text', `%${q.trim()}%`)
            .order('year_written', { ascending: true })
            .limit(100),
          supabase
            .from('sermons')
            .select('id', { count: 'exact', head: true })
            .ilike('sermon_text', `%${q.trim()}%`),
          supabase
            .from('sermons')
            .select('id, title, year_preached, source_collection, sermon_text, authors(name, born_year, died_year, era)')
            .ilike('sermon_text', `%${q.trim()}%`)
            .order('year_preached', { ascending: true })
            .limit(100),
        ]);

        if (versesRes.error) throw versesRes.error;
        if (commRes.error) throw commRes.error;
        if (sermonRes.error) throw sermonRes.error;
        const textTotal = verseCount.count || 0;
        const textResults = (versesRes.data || []) as BibleVerse[];
        const textCommTotal = commCount.count || 0;
        const textCommentaries = (commRes.data || []) as CommentaryWithAuthor[];
        const textSermonTotal = sermonCount.count || 0;
        const textSermons = sermonRes.data || [];

        setTextTotal(textTotal);
        setTextResults(textResults);
        setTextCommTotal(textCommTotal);
        setTextCommentaries(textCommentaries);
        setTextSermonTotal(textSermonTotal);
        setTextSermons(textSermons);

        // Auto-select first tab with results
        const textTab = textResults.length ? 'bijbel' : textCommentaries.length ? 'verklaringen' : 'preken';
        if (textResults.length) setTextTab('bijbel');
        else if (textCommentaries.length) setTextTab('verklaringen');
        else if (textSermons.length) setTextTab('preken');

        // Cache results
        setCache(cacheKey, { textTotal, textResults, textCommTotal, textCommentaries, textSermonTotal, textSermons, textTab });

        if (!textResults.length && !textCommentaries.length && !textSermons.length) {
          setError(`Geen resultaten gevonden voor "${q.trim()}".`);
        }
      } catch {
        setError('Fout bij het zoeken.');
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true); setError(null); setExpanded({}); setShowSuggestions(false);
    setTextResults([]);
    setRefLabel(formatRef(ref));
    setCurrentRef(ref);
    addToHistory(q.trim());

    try {
      // Book ID lookup with cache
      let bookId = bookIdCache.get(ref.book) ?? '';
      if (!bookId) {
        const { data: books } = await supabase
          .from('bible_books').select('id').eq('name', ref.book).limit(1);
        if (!books?.length) {
          setError(`Boek "${ref.book}" niet gevonden.`);
          setVerses([]); setCommentaries([]); setKanttekeningen([]); setCrossRefs([]);
          setLoading(false); return;
        }
        bookId = books[0].id;
        bookIdCache.set(ref.book, bookId);
      }

      // Fetch verse range
      const { data: vData } = await supabase.from('bible_verses')
        .select('*, bible_books(name, abbreviation)')
        .eq('book_id', bookId)
        .eq('chapter', ref.chapter)
        .gte('verse', ref.verseStart)
        .lte('verse', ref.verseEnd)
        .order('verse', { ascending: true });

      if (!vData?.length) {
        // If verseStart > max verse, try last verse of chapter (for prev/next overflow)
        if (ref.verseStart > 1) {
          setError(`${formatRef(ref)} niet gevonden.`);
        } else {
          setError(`${ref.book} ${ref.chapter} niet gevonden.`);
        }
        setVerses([]); setCommentaries([]); setKanttekeningen([]); setCrossRefs([]);
        setLoading(false); return;
      }

      // Update currentRef with actual verse numbers found (clamping)
      const actualStart = vData[0].verse;
      const actualEnd = vData[vData.length - 1].verse;
      const actualRef = { ...ref, verseStart: actualStart, verseEnd: actualEnd };
      setCurrentRef(actualRef);
      setRefLabel(formatRef(actualRef));

      setVerses(vData as BibleVerse[]);
      const verseIds = vData.map((v: any) => v.id);

      // Parallel fetch all supplementary data
      const [commRes, kantRes, crossRes] = await Promise.all([
        supabase.from('commentaries')
          .select('*, authors(name, born_year, died_year, era)')
          .in('verse_id', verseIds)
          .neq('scope', 'book')
          .order('year_written', { ascending: true }),
        supabase.from('kanttekeningen').select('*')
          .in('verse_id', verseIds).order('note_order', { ascending: true }),
        supabase.from('cross_references')
          .select('id, votes, to_verse_end_id, to_verse:bible_verses!to_verse_id(id, book_id, chapter, verse, text_sv, bible_books(name, abbreviation))')
          .in('from_verse_id', verseIds).order('votes', { ascending: false }).limit(20),
      ]);

      // De-duplicate: prefer verse scope over passage for same author+verse
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
      deduped.sort((a, b) => (a.year_written || 0) - (b.year_written || 0));

      setCommentaries(deduped);
      // Sort kanttekeningen by verse number, then note_order
      const kantData = (kantRes.data || []) as Kanttekening[];
      const verseNumMap = new Map(vData.map((v: any) => [v.id, v.verse]));
      kantData.sort((a, b) => {
        const va = verseNumMap.get(a.verse_id) || 0;
        const vb = verseNumMap.get(b.verse_id) || 0;
        if (va !== vb) return va - vb;
        return (a.note_order || 0) - (b.note_order || 0);
      });
      setKanttekeningen(kantData);
      setCrossRefs((crossRes.data || []) as unknown as CrossRefRow[]);
    } catch {
      setError('Fout bij het zoeken. Controleer je internetverbinding.');
    } finally {
      setLoading(false);
    }
  }, []);

  const search = useCallback(() => searchWithQuery(query), [query, searchWithQuery]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestion(prev => Math.min(prev + 1, suggestions.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestion(prev => Math.max(prev - 1, -1));
        return;
      }
      if (e.key === 'Tab' && selectedSuggestion >= 0) {
        e.preventDefault();
        const sug = suggestions[selectedSuggestion];
        setQuery(sug.label + ' ');
        setShowSuggestions(false);
        setSelectedSuggestion(-1);
        return;
      }
      if (e.key === 'Enter' && selectedSuggestion >= 0) {
        e.preventDefault();
        const sug = suggestions[selectedSuggestion];
        if (sug.type === 'history') {
          setQuery(sug.label);
          setShowSuggestions(false);
          setSelectedSuggestion(-1);
          setTimeout(() => searchWithQuery(sug.label), 0);
        } else {
          setQuery(sug.label + ' ');
          setShowSuggestions(false);
          setSelectedSuggestion(-1);
        }
        return;
      }
    }
    if (e.key === 'Enter') { search(); setShowSuggestions(false); }
    if (e.key === 'Escape') setShowSuggestions(false);
  };

  const selectSuggestion = (sug: { label: string; type: string }) => {
    if (sug.type === 'history') {
      setQuery(sug.label);
      setShowSuggestions(false);
      setTimeout(() => searchWithQuery(sug.label), 0);
    } else {
      setQuery(sug.label + ' ');
      setShowSuggestions(false);
      inputRef.current?.focus();
    }
  };

  const goNav = (direction: 'prev' | 'next') => {
    if (!currentRef) return;
    const newQuery = navigateRef(currentRef, direction);
    setQuery(newQuery);
    navigate(`/zoeken?q=${encodeURIComponent(newQuery)}`, { replace: true });
  };

  const isRange = verses.length > 1;

  return (
    <>
      <div className="screen-header">
        <h1>Zoeken</h1>
      </div>
      <div className="page">
        <Logo />

        <div className="welcome">
          <p>Ontdek bijbelverklaringen van de oudvaders</p>
          <div className="hint">
            Zoek op bijbelreferentie of trefwoord, bijvoorbeeld:<br />
            Joh 3:16 &middot; Psalm 23 vers 1 tot 6 &middot; genade
          </div>
        </div>

        {/* Search bar with autocomplete */}
        <div className="search-bar-wrap">
          <div className="search-bar">
            <input
              ref={inputRef}
              type="text"
              placeholder="Bijbelreferentie of trefwoord…"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); setSelectedSuggestion(-1); }}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowSuggestions(true)}
              autoComplete="off"
              autoCorrect="off"
            />
            <div className="search-actions">
              {query && (
                <button className="search-action-btn search-clear" onClick={() => { setQuery(''); inputRef.current?.focus(); }} title="Wissen" type="button">
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

          {/* Autocomplete dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="ac-dropdown" ref={suggestionsRef}>
              {suggestions.map((sug, i) => (
                <div
                  key={sug.label}
                  className={`ac-item ${i === selectedSuggestion ? 'ac-selected' : ''}`}
                  onMouseDown={() => selectSuggestion(sug)}
                  onMouseEnter={() => setSelectedSuggestion(i)}
                >
                  <span className="ac-icon">{sug.type === 'history' ? '\u29D6' : '\u25C8'}</span>
                  <span className="ac-label">{sug.label}</span>
                  {sug.type === 'history' && <span className="ac-hint">recent</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dagvers — altijd zichtbaar onder zoekbalk */}
        {dailyVerse && !loading && verses.length === 0 && textResults.length === 0 && (
          <div className="daily-card" onClick={() => setDailyExpanded(!dailyExpanded)}>
            <div className="daily-badge">{'\u2726'} Dagvers</div>
            <div className="daily-ref">{dailyVerse.ref}</div>
            <div className="daily-text">{dailyVerse.text}</div>
            {dailyVerse.authorName && (
              <>
                <div className="daily-rule" />
                <div className="daily-author">{dailyVerse.authorName}</div>
                <div className="daily-comm">
                  {dailyExpanded ? dailyVerse.fullCommentary : dailyVerse.commentary}
                </div>
                {!dailyExpanded && dailyVerse.fullCommentary.length > 250 && (
                  <div className="daily-more">Lees meer {'\u25BE'}</div>
                )}
                {dailyExpanded && (
                  <Link
                    to={`/zoeken?q=${encodeURIComponent(dailyVerse.ref)}`}
                    className="daily-link"
                    onClick={e => e.stopPropagation()}
                  >
                    Bekijk alle verklaringen {'\u2192'}
                  </Link>
                )}
              </>
            )}
          </div>
        )}

        {/* Opgeslagen & Geschiedenis — altijd zichtbaar als er items zijn */}
        {(saved.length > 0 || history.length > 0) && verses.length === 0 && !loading && (
          <div className="sh-bar">
            {saved.length > 0 && (
              <div className="sh-section">
                <div className="sh-section-header" onClick={() => setShowSaved(!showSaved)}>
                  <span className="sh-section-title">
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style={{verticalAlign: 'middle', marginRight: 4}}>
                      <path d="M5 3C5 2.44772 5.44772 2 6 2H14C14.5523 2 15 2.44772 15 3V17.5L10 14L5 17.5V3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                    </svg>
                    Opgeslagen ({saved.length})
                  </span>
                  <span className="sh-toggle">{showSaved ? '\u25B2' : '\u25BC'}</span>
                </div>
                {showSaved && (
                  <div className="sh-saved-list">
                    {saved.map((s) => (
                      <div key={s.verseId} className="sh-saved-item">
                        <Link to={`/zoeken?q=${encodeURIComponent(s.ref)}`} className="sh-saved-link">
                          <span className="sh-saved-ref">{s.ref}</span>
                          <span className="sh-saved-text">{truncate(s.text, 80)}</span>
                        </Link>
                        <button className="sh-saved-rm" onClick={() => removeSaved(s.verseId)} title="Verwijderen">{'\u00D7'}</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {history.length > 0 && (
              <div className="sh-section">
                <div className="sh-section-header">
                  <span className="sh-section-title">{'\u29D6'} Recent</span>
                  <button className="sh-clear" onClick={clearHistory}>Wis</button>
                </div>
                <div className="sh-chips">
                  {history.map((h) => (
                    <div key={h} className="sh-chip">
                      <Link to={`/zoeken?q=${encodeURIComponent(h)}`} className="sh-chip-link">{h}</Link>
                      <button className="sh-chip-rm" onClick={() => removeFromHistory(h)}>{'\u00D7'}</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {loading && <div className="loader"><div className="spinner" /></div>}
        {error && <div className="error-box">{error}</div>}

        {verses.length > 0 && !loading && (
          <>
            {/* Verse card with nav */}
            <div className="verse-card">
              <div className="verse-card-top">
                <button className="verse-nav-btn" onClick={() => goNav('prev')} title="Vorig vers">{'\u2039'}</button>
                <div className="verse-ref">{refLabel}</div>
                <button className="verse-nav-btn" onClick={() => goNav('next')} title="Volgend vers">{'\u203A'}</button>
                {!isRange && (
                  <button
                    className={`save-btn ${isSaved(verses[0].id) ? 'saved' : ''}`}
                    onClick={(e) => { e.stopPropagation(); toggleSave(verses[0].id, refLabel, verses[0].text_sv); }}
                    title={isSaved(verses[0].id) ? 'Verwijder uit opgeslagen' : 'Opslaan'}
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M5 3C5 2.44772 5.44772 2 6 2H14C14.5523 2 15 2.44772 15 3V17.5L10 14L5 17.5V3Z"
                        fill={isSaved(verses[0].id) ? 'currentColor' : 'none'}
                        stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                    </svg>
                  </button>
                )}
              </div>
              {verses.map(v => (
                <p key={v.id} className="verse-text" style={isRange ? { marginBottom: 4 } : undefined}
                  data-edit-table="bible_verses" data-edit-id={v.id} data-edit-col="text_sv"
                  data-edit-label={`${refLabel} :${v.verse}`}>
                  {isRange && <sup style={{ fontSize: 11, color: 'var(--accent-dim)', marginRight: 2 }}>{v.verse}</sup>}
                  {v.text_sv}
                </p>
              ))}
            </div>

            {/* Kanttekeningen */}
            {kanttekeningen.length > 0 && (
              <div className="detail-section" style={{ marginBottom: 'var(--sp-md)' }}>
                <div className="section-title">Kanttekeningen ({kanttekeningen.length})</div>
                {(() => {
                  // Group by verse, keeping verse order
                  const byVerse = new Map<string, Kanttekening[]>();
                  for (const v of verses) {
                    byVerse.set(v.id, []);
                  }
                  for (const k of kanttekeningen) {
                    const list = byVerse.get(k.verse_id);
                    if (list) list.push(k);
                    else byVerse.set(k.verse_id, [k]);
                  }
                  return Array.from(byVerse.entries()).map(([verseId, kants]) => {
                    if (kants.length === 0) return null;
                    // Sort within verse by note_order
                    kants.sort((a, b) => (a.note_order || 0) - (b.note_order || 0));
                    const v = verses.find(vv => vv.id === verseId);
                    return (
                      <div key={verseId} className="kant-verse-group">
                        {isRange && v && (
                          <div className="comm-verse-heading">
                            <span className="comm-verse-ref">{v.bible_books?.name || ''} {v.chapter}:{v.verse}</span>
                          </div>
                        )}
                        {kants.map((k) => (
                          <div key={k.id} className="kanttekening-item">
                            {k.marker && <span className="kant-marker">{k.marker}</span>}
                            <span className="kant-text" data-edit-table="kanttekeningen" data-edit-id={k.id} data-edit-col="note_text" data-edit-label={`Kanttekening ${k.marker || ''}`}>{expandInlineRefs(k.note_text)}</span>
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
                    );
                  });
                })()}
              </div>
            )}

            {/* Verklaringen — gegroepeerd per vers */}
            <div>
              <div className="section-title">Verklaringen ({commentaries.length})</div>
              {commentaries.length > 1 && (
                <button
                  className={`compare-toggle ${compareMode ? 'active' : ''}`}
                  onClick={() => setCompareMode(!compareMode)}
                >
                  {compareMode ? '\u2630 Lijst' : '\u229E Vergelijk'}
                </button>
              )}
              {commentaries.length === 0 ? (
                <div className="empty-text">Geen verklaringen gevonden.</div>
              ) : compareMode && !isRange ? (
                <div className="compare-grid">
                  {commentaries.map((item) => {
                    const text = item.commentary_text || '';
                    const authorName = item.authors?.name || 'Onbekend';
                    const years = item.authors?.born_year
                      ? `${item.authors.born_year}\u2013${item.authors.died_year || '?'}` : '';
                    return (
                      <div key={item.id} className="compare-card">
                        <div className="commentary-header">
                          <span className="author-name">{authorName}</span>
                          {years && <span className="author-years">{years}</span>}
                          {item.year_written && <span className="year-badge">{item.year_written}</span>}
                          <button
                            className={`detail-bm-btn ${isDetailBookmarked(item.id) ? 'active' : ''}`}
                            onClick={(e) => { e.stopPropagation(); toggleDetailBookmark('verklaring', item.id, text, authorName); }}
                            title="Bladwijzer"
                          >
                            <svg width="14" height="14" viewBox="0 0 20 20" fill={isDetailBookmarked(item.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
                              <path d="M5 3C5 2.44772 5.44772 2 6 2H14C14.5523 2 15 2.44772 15 3V17.5L10 14L5 17.5V3Z" />
                            </svg>
                          </button>
                        </div>
                        <div className="commentary-text" data-edit-table="commentaries" data-edit-id={item.id} data-edit-col="commentary_text" data-edit-label={`${authorName} — verklaring`}>
                          {splitIntoParagraphs(text).map((para, pi) => (
                            <p key={pi} className="comm-para">{expandInlineRefs(para)}</p>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                (() => {
                  // Group by verse, keeping verse order
                  const byVerse = new Map<string, CommentaryWithAuthor[]>();
                  for (const v of verses) {
                    byVerse.set(v.id, []);
                  }
                  for (const c of commentaries) {
                    const list = byVerse.get(c.verse_id);
                    if (list) list.push(c);
                    else byVerse.set(c.verse_id, [c]);
                  }
                  return Array.from(byVerse.entries()).map(([verseId, comms]) => {
                    if (comms.length === 0) return null;
                    const v = verses.find(vv => vv.id === verseId);
                    return (
                      <div key={verseId} className="comm-verse-group">
                        {isRange && v && (
                          <div className="comm-verse-heading">
                            <span className="comm-verse-ref">{v.bible_books?.name || ''} {v.chapter}:{v.verse}</span>
                            {v.text_sv && <span className="comm-verse-sv">{v.text_sv}</span>}
                          </div>
                        )}
                        {comms.map((item) => {
                          const isExpanded = expanded[item.id];
                          const text = item.commentary_text || '';
                          const preview = truncate(text, 200);
                          const authorName = item.authors?.name || 'Onbekend';
                          const years = item.authors?.born_year
                            ? `${item.authors.born_year}\u2013${item.authors.died_year || '?'}` : '';
                          return (
                            <div key={item.id} className={`commentary-card${isExpanded ? ' print-show' : ''}`} onClick={() => toggleExpand(item.id)}>
                              <div className="commentary-header">
                                <span className="author-name">{authorName}</span>
                                {years && <span className="author-years">{years}</span>}
                                {item.year_written && <span className="year-badge">{item.year_written}</span>}
                                <button
                                  className={`detail-bm-btn ${isDetailBookmarked(item.id) ? 'active' : ''}`}
                                  onClick={(e) => { e.stopPropagation(); toggleDetailBookmark('verklaring', item.id, text, authorName); }}
                                  title="Bladwijzer"
                                >
                                  <svg width="14" height="14" viewBox="0 0 20 20" fill={isDetailBookmarked(item.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
                                    <path d="M5 3C5 2.44772 5.44772 2 6 2H14C14.5523 2 15 2.44772 15 3V17.5L10 14L5 17.5V3Z" />
                                  </svg>
                                </button>
                              </div>
                              <div className="commentary-text" data-edit-table="commentaries" data-edit-id={item.id} data-edit-col="commentary_text" data-edit-label={`${authorName} — verklaring`}>
                                {isExpanded
                                  ? splitIntoParagraphs(text).map((para, pi) => (
                                      <p key={pi} className="comm-para">{expandInlineRefs(para)}</p>
                                    ))
                                  : expandInlineRefs(preview)
                                }
                              </div>
                              {text.length > 200 && (
                                <div className="expand-hint">{isExpanded ? 'Inklappen \u25B2' : 'Lees meer \u25BC'}</div>
                              )}
                              <Link to={`/boeklezer/${item.author_id}?commentaryId=${item.id}&verseId=${item.verse_id}`}
                                className="bl-read-link" onClick={e => e.stopPropagation()}>
                                Lees in boekvorm →
                              </Link>
                            </div>
                          );
                        })}
                      </div>
                    );
                  });
                })()
              )}
            </div>

            {/* Kruisverwijzingen */}
            {crossRefs.length > 0 && (
              <div className="cross-refs-section" style={{ marginBottom: 'var(--sp-md)' }}>
                <div className="section-title">Kruisverwijzingen ({crossRefs.length})</div>
                <div className="cross-refs-list">
                  {crossRefs.map((cr) => {
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
              </div>
            )}
          </>
        )}

        {/* Text search results — tabbed: Bijbel / Verklaringen / Preken */}
        {(textResults.length > 0 || textCommentaries.length > 0 || textSermons.length > 0) && !loading && (
          <div className="text-results">
            {/* Tab bar */}
            <div className="tr-tabs">
              <button className={`tr-tab${textTab === 'bijbel' ? ' active' : ''}`} onClick={() => setTextTab('bijbel')}>
                Bijbel <span className="tr-tab-count">{textTotal}</span>
              </button>
              <button className={`tr-tab${textTab === 'verklaringen' ? ' active' : ''}`} onClick={() => setTextTab('verklaringen')}>
                Verklaringen <span className="tr-tab-count">{textCommTotal}</span>
              </button>
              <button className={`tr-tab${textTab === 'preken' ? ' active' : ''}`} onClick={() => setTextTab('preken')}>
                Preken <span className="tr-tab-count">{textSermonTotal}</span>
              </button>
            </div>

            {/* ── Tab: Bijbel ── */}
            {textTab === 'bijbel' && (() => {
              const byBook = new Map<string, { book: any; verses: any[] }>();
              for (const v of textResults as any[]) {
                const bookName = v.bible_books?.name || 'Onbekend';
                if (!byBook.has(bookName)) byBook.set(bookName, { book: v.bible_books, verses: [] });
                byBook.get(bookName)!.verses.push(v);
              }
              const entries = Array.from(byBook.entries());
              const otEntries = entries.filter(([, g]) => g.book?.testament === 'OT');
              const ntEntries = entries.filter(([, g]) => g.book?.testament === 'NT');
              const sortByOrder = (a: [string, any], b: [string, any]) =>
                (a[1].book?.book_order || 0) - (b[1].book?.book_order || 0);
              otEntries.sort(sortByOrder);
              ntEntries.sort(sortByOrder);

              const renderGroup = (bookName: string, group: { book: any; verses: any[] }) => {
                const isCollapsed = textCollapsed[bookName] !== false && group.verses.length > 3;
                const shown = isCollapsed ? group.verses.slice(0, 3) : group.verses;
                return (
                  <div key={bookName} className="tr-book-group">
                    <div className="tr-book-header">
                      <span className="tr-book-name">{displayBookName(bookName)}</span>
                      <span className="tr-book-count">{group.verses.length}×</span>
                    </div>
                    {shown.map((v: any) => (
                      <Link key={v.id} to={`/zoeken?q=${encodeURIComponent(`${v.bible_books?.name || ''} ${v.chapter}:${v.verse}`)}`} className="text-result-item">
                        <span className="text-result-ref">{v.chapter}:{v.verse}</span>
                        <span className="text-result-text">{v.text_sv}</span>
                      </Link>
                    ))}
                    {group.verses.length > 3 && (
                      <button className="tr-show-more" onClick={() => setTextCollapsed(prev => ({ ...prev, [bookName]: isCollapsed ? false : true }))}>
                        {isCollapsed ? `Alle ${group.verses.length} tonen ▾` : 'Minder tonen ▴'}
                      </button>
                    )}
                  </div>
                );
              };

              return textResults.length === 0 ? (
                <div className="empty-text">Geen bijbelverzen gevonden.</div>
              ) : (
                <>
                  <div className="tr-tab-subtitle">
                    "{query.trim()}" — {textTotal} keer in de Bijbel
                    {textResults.length < textTotal && <span className="tr-shown"> (eerste {textResults.length} getoond)</span>}
                  </div>
                  {otEntries.length > 0 && (
                    <div className="tr-testament-section">
                      <div className="tr-testament-header ot">Oude Testament <span className="tr-testament-count">{otEntries.reduce((s, [, g]) => s + g.verses.length, 0)}</span></div>
                      {otEntries.map(([name, group]) => renderGroup(name, group))}
                    </div>
                  )}
                  {ntEntries.length > 0 && (
                    <div className="tr-testament-section">
                      <div className="tr-testament-header nt">Nieuwe Testament <span className="tr-testament-count">{ntEntries.reduce((s, [, g]) => s + g.verses.length, 0)}</span></div>
                      {ntEntries.map(([name, group]) => renderGroup(name, group))}
                    </div>
                  )}
                </>
              );
            })()}

            {/* ── Tab: Verklaringen ── */}
            {textTab === 'verklaringen' && (
              textCommentaries.length === 0 ? (
                <div className="empty-text">Geen verklaringen gevonden.</div>
              ) : (
                <>
                  <div className="tr-tab-subtitle">
                    {textCommTotal} verklaringen met "{query.trim()}"
                    {textCommentaries.length < textCommTotal && <span className="tr-shown"> (eerste {textCommentaries.length} getoond)</span>}
                  </div>
                  {textCommentaries.map((item) => {
                    const isExp = expanded[item.id];
                    const text = item.commentary_text || '';
                    const preview = truncate(text, 200);
                    const authorName = item.authors?.name || 'Onbekend';
                    const years = item.authors?.born_year
                      ? `${item.authors.born_year}\u2013${item.authors.died_year || '?'}` : '';
                    const era = item.authors?.era;
                    return (
                      <div key={item.id} className={`commentary-card${isExp ? ' print-show' : ''}`} onClick={() => toggleExpand(item.id)}>
                        <div className="commentary-header">
                          <span className="author-name">{authorName}</span>
                          {years && <span className="author-years">{years}</span>}
                          {item.year_written && <span className="year-badge">{item.year_written}</span>}
                          {era && <span className="author-era" style={{ color: ERA_COLORS[era] }}>{era}</span>}
                        </div>
                        <div className="commentary-text">
                          {isExp
                            ? splitIntoParagraphs(text).map((para, pi) => (
                                <p key={pi} className="comm-para">{expandInlineRefs(para)}</p>
                              ))
                            : expandInlineRefs(preview)
                          }
                        </div>
                        {text.length > 200 && (
                          <div className="expand-hint">{isExp ? 'Inklappen \u25B2' : 'Lees meer \u25BC'}</div>
                        )}
                      </div>
                    );
                  })}
                </>
              )
            )}

            {/* ── Tab: Preken ── */}
            {textTab === 'preken' && (
              textSermons.length === 0 ? (
                <div className="empty-text">Geen preken gevonden.</div>
              ) : (
                <>
                  <div className="tr-tab-subtitle">
                    {textSermonTotal} preken met "{query.trim()}"
                    {textSermons.length < textSermonTotal && <span className="tr-shown"> (eerste {textSermons.length} getoond)</span>}
                  </div>
                  {textSermons.map((s: any) => {
                    const isExp = expanded[s.id];
                    const text = s.sermon_text || '';
                    const preview = truncate(text, 250);
                    const authorName = s.authors?.name || 'Onbekend';
                    const years = s.authors?.born_year
                      ? `${s.authors.born_year}\u2013${s.authors.died_year || '?'}` : '';
                    const era = s.authors?.era;
                    return (
                      <div key={s.id} className="commentary-card" onClick={() => toggleExpand(s.id)}>
                        <div className="commentary-header">
                          <span className="author-name">{authorName}</span>
                          {years && <span className="author-years">{years}</span>}
                          {era && <span className="author-era" style={{ color: ERA_COLORS[era] }}>{era}</span>}
                        </div>
                        <div className="sermon-title-row">
                          <span className="sermon-title">{s.title}</span>
                          {s.year_preached && <span className="year-badge">{s.year_preached}</span>}
                        </div>
                        <div className="commentary-text">
                          {isExp
                            ? splitIntoParagraphs(text).map((para, pi) => (
                                <p key={pi} className="comm-para">{expandInlineRefs(para)}</p>
                              ))
                            : expandInlineRefs(preview)
                          }
                        </div>
                        {text.length > 250 && (
                          <div className="expand-hint">{isExp ? 'Inklappen \u25B2' : 'Lees meer \u25BC'}</div>
                        )}
                        <Link to={`/preek/${s.id}`} className="bl-read-link" onClick={e => e.stopPropagation()}>
                          Lees volledige preek →
                        </Link>
                      </div>
                    );
                  })}
                </>
              )
            )}
          </div>
        )}

        {/* Welcome (alleen als idle) */}
        {verses.length === 0 && textResults.length === 0 && textCommentaries.length === 0 && textSermons.length === 0 && !loading && !error && (
          <>
            {/* Thema chips */}
            <div className="theme-chips">
              {POPULAR_THEMES.map((th) => (
                <button
                  key={th.query}
                  className="theme-chip"
                  onClick={() => { setQuery(th.query); searchWithQuery(th.query); }}
                >
                  {th.label}
                </button>
              ))}
            </div>

          </>
        )}
        <SelectionPopup verseRef={refLabel} />
      </div>
    </>
  );
}
