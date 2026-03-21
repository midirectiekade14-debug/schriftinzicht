import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { truncate } from '../lib/truncate';

interface CommentaryEntry {
  id: string;
  commentary_text: string;
  verse_id: string;
  language: string;
  year_written: number | null;
  scope: string;
  bible_verses: {
    chapter: number;
    verse: number;
    text_sv: string;
    bible_books: { name: string; abbreviation: string; book_order: number };
  };
}

interface BookEntry {
  id: string;
  commentary_text: string;
  verse_id: string;
  scope: string;
  bible_verses: {
    chapter: number;
    verse: number;
    bible_books: { name: string; book_order: number };
  };
}

interface SideCommentary {
  id: string;
  author_id: string;
  verse_id: string;
  commentary_text: string;
  language: string;
  year_written: number | null;
  authors: { name: string; born_year: number | null; died_year: number | null; era: string | null } | null;
}

const ERA_ORDER = ['Reformatie', 'Nadere Reformatie', 'Puriteinse periode', '19e eeuw', 'Kerkvaders'];
const ERA_COLORS: Record<string, string> = {
  'Reformatie': '#D4A574',
  'Nadere Reformatie': '#8BB89E',
  'Puriteinse periode': '#7BA8C8',
  '19e eeuw': '#C8A870',
  'Kerkvaders': '#B8A090',
};

interface SourceWork {
  id: string;
  title: string;
  year_published: number | null;
  language_orig: string;
}

interface AuthorInfo {
  id: string;
  name: string;
  born_year: number | null;
  died_year: number | null;
}

interface TocEntry {
  bookName: string;
  bookOrder: number;
  chapters: number[];
}

interface Bookmark {
  page: number;
  label: string;
  ts: number;
  authorId?: string;
  authorName?: string;
}

const CHARS_PER_PAGE = 1800;
const BOOKMARKS_KEY = 'bl-bookmarks';
const HISTORY_KEY = 'bl-history';
const BL_NOTES_KEY = 'bl-notes';

interface SavedNote {
  text: string;
  ref: string;
  authorName: string;
  ts: number;
}

function loadNotes(): SavedNote[] {
  try { return JSON.parse(localStorage.getItem(BL_NOTES_KEY) || '[]'); } catch { return []; }
}

type PageData = { blocks: string[]; verseIds: string[]; entryIds: string[]; mode: 'verse' | 'book' };

function paginateEntries(entries: CommentaryEntry[]): PageData[] {
  const pages: PageData[] = [];
  let curBlocks: string[] = [];
  let curVids: string[] = [];
  let curEids: string[] = [];
  let curLen = 0;

  for (const entry of entries) {
    const bv = entry.bible_verses;
    const ref = `${bv.bible_books.name} ${bv.chapter}:${bv.verse}`;
    const block = `\x00REF:${ref}\x00\n${entry.commentary_text.trim()}`;

    if (curLen > 0 && curLen + block.length > CHARS_PER_PAGE) {
      pages.push({ blocks: curBlocks, verseIds: curVids, entryIds: curEids, mode: 'verse' });
      curBlocks = [];
      curVids = [];
      curEids = [];
      curLen = 0;
    }

    curBlocks.push(block);
    curVids.push(entry.verse_id);
    curEids.push(entry.id);
    curLen += block.length;
  }

  if (curBlocks.length > 0) {
    pages.push({ blocks: curBlocks, verseIds: curVids, entryIds: curEids, mode: 'verse' });
  }

  return pages;
}

function paginateBookEntries(entries: BookEntry[]): PageData[] {
  // Sort by book order
  const sorted = [...entries].sort(
    (a, b) => a.bible_verses.bible_books.book_order - b.bible_verses.bible_books.book_order
  );

  const pages: PageData[] = [];
  let curParagraphs: string[] = [];
  let curEids: string[] = [];
  let curLen = 0;

  for (const entry of sorted) {
    const bookName = entry.bible_verses.bible_books.name;
    const paragraphs = entry.commentary_text
      .split(/\n{2,}/)
      .map(p => p.trim())
      .filter(p => p.length > 0);

    const headerPara = `\x00BOOK:${bookName}\x00`;
    curParagraphs.push(headerPara);
    curEids.push(entry.id);
    curLen += bookName.length + 4;

    for (const para of paragraphs) {
      if (curLen > 0 && curLen + para.length > CHARS_PER_PAGE) {
        pages.push({ blocks: curParagraphs, verseIds: [entry.verse_id], entryIds: curEids, mode: 'book' });
        curParagraphs = [];
        curEids = [];
        curLen = 0;
      }
      curParagraphs.push(para);
      curLen += para.length;
    }
  }

  if (curParagraphs.length > 0) {
    pages.push({ blocks: curParagraphs, verseIds: [sorted[sorted.length - 1]?.verse_id || ''], entryIds: curEids, mode: 'book' });
  }

  return pages;
}

function renderBlock(block: string, idx: number) {
  const parts = block.split(/\x00REF:(.*?)\x00\n/);
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;

    if (i % 2 === 1) {
      elements.push(
        <div key={`ref-${idx}-${i}`} className="bl-verse-ref">
          <span className="bl-ref-ornament">{'\u2767'}</span>
          {part}
          <span className="bl-ref-ornament">{'\u2619'}</span>
        </div>
      );
    } else {
      const paragraphs = part.split('\n').filter(p => p.trim());
      paragraphs.forEach((p, pi) => {
        elements.push(
          <p key={`p-${idx}-${i}-${pi}`} className="bl-paragraph">
            {p}
          </p>
        );
      });
    }
  }

  return <div key={`block-${idx}`} className="bl-entry">{elements}</div>;
}

function renderBookBlock(block: string, idx: number) {
  // Check for book header marker
  const bookMatch = block.match(/^\x00BOOK:(.*?)\x00$/);
  if (bookMatch) {
    return (
      <div key={`bh-${idx}`} className="bl-book-header">
        <span className="bl-ref-ornament">{'\u2767'}</span>
        {bookMatch[1]}
        <span className="bl-ref-ornament">{'\u2619'}</span>
      </div>
    );
  }

  // Regular paragraph — split on single newlines for sub-paragraphs
  const lines = block.split('\n').filter(l => l.trim());
  return (
    <div key={`bp-${idx}`} className="bl-entry">
      {lines.map((line, li) => (
        <p key={`bl-${idx}-${li}`} className="bl-paragraph">{line}</p>
      ))}
    </div>
  );
}

export default function Boeklezer() {
  const { authorId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const filterBook = searchParams.get('boek');
  const filterChapter = searchParams.get('hfst');
  const deepVerseId = searchParams.get('verseId');
  const deepCommentaryId = searchParams.get('commentaryId');
  const deepPage = searchParams.get('page');

  const [author, setAuthor] = useState<AuthorInfo | null>(null);
  const [sourceWorks, setSourceWorks] = useState<SourceWork[]>([]);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [entries, setEntries] = useState<CommentaryEntry[]>([]);
  const [bookEntries, setBookEntries] = useState<BookEntry[]>([]);
  const [bookIndex, setBookIndex] = useState<{ name: string; order: number }[]>([]);
  const [viewMode, setViewMode] = useState<'verse' | 'book'>('verse');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [tocOpen, setTocOpen] = useState(false);
  const [jumpInput, setJumpInput] = useState('');
  const [turning, setTurning] = useState<'left' | 'right' | null>(null);

  // Selection popup
  const [selPopup, setSelPopup] = useState<{ text: string; x: number; y: number } | null>(null);
  const [blNotes, setBlNotes] = useState<SavedNote[]>(loadNotes);

  // Deep link highlight
  const [highlight, setHighlight] = useState(false);

  // Sidebars
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [sideCommentaries, setSideCommentaries] = useState<SideCommentary[]>([]);
  const [sideLoading, setSideLoading] = useState(false);

  const pageRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  // Load bookmarks from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(BOOKMARKS_KEY);
      if (saved) setBookmarks(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  // Save history entry on page visit
  useEffect(() => {
    if (!authorId || !author) return;
    try {
      const hist = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') as { authorId: string; name: string; ts: number }[];
      const entry = { authorId, name: author.name, ts: Date.now() };
      const filtered = hist.filter(h => h.authorId !== authorId);
      filtered.unshift(entry);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered.slice(0, 10)));
    } catch { /* ignore */ }
  }, [authorId, author]);

  // Load author & source works
  useEffect(() => {
    if (!authorId) return;

    Promise.all([
      supabase
        .from('authors')
        .select('id, name, born_year, died_year')
        .eq('id', authorId)
        .single(),
      supabase
        .from('source_works')
        .select('id, title, year_published, language_orig')
        .eq('author_id', authorId),
    ]).then(([authorRes, sourceRes]) => {
      if (authorRes.error) { setError('Kon auteur niet laden.'); return; }
      setAuthor(authorRes.data as AuthorInfo);
      const works = (sourceRes.data || []) as SourceWork[];
      setSourceWorks(works);
      const nlWork = works.find(w => w.language_orig === 'nl');
      setSelectedSource(nlWork?.id || works[0]?.id || null);
    }).catch(() => setError('Kon gegevens niet laden.'));
  }, [authorId]);

  // Load commentaries — try book-scope first, fall back to verse-scope
  useEffect(() => {
    if (!authorId) return;
    setLoading(true);

    const loadData = async () => {
      try {
      // Step 1: Check if book-scope entries exist (lightweight: no commentary_text)
      let bookCheckQuery = supabase
        .from('commentaries')
        .select('id, verse_id, scope, bible_verses:bible_verses!commentaries_verse_id_fkey!inner(chapter, verse, bible_books!inner(name, book_order))')
        .eq('author_id', authorId)
        .eq('scope', 'book')
        .order('verse_id', { ascending: true });

      if (selectedSource) {
        bookCheckQuery = bookCheckQuery.eq('source_work_id', selectedSource);
      }

      const { data: bookIndex } = await bookCheckQuery;
      const hasBookEntries = (bookIndex || []).length > 0;

      if (hasBookEntries) {
        // Build TOC from index
        const booksMap = new Map<string, number>();
        for (const b of (bookIndex || [])) {
          const bv = (b as any).bible_verses.bible_books;
          if (!booksMap.has(bv.name)) booksMap.set(bv.name, bv.book_order);
        }
        setBookIndex([...booksMap.entries()].map(([name, order]) => ({ name, order })).sort((a, b) => a.order - b.order));

        // Book mode — load only the selected/first book's text (lazy)
        const targetBook = filterBook || (bookIndex![0] as any).bible_verses.bible_books.name;

        // Get the commentary IDs for the target book
        const targetIds = (bookIndex || [])
          .filter((b: any) => b.bible_verses.bible_books.name === targetBook)
          .map((b: any) => b.id);

        if (targetIds.length > 0) {
          // Now fetch full text only for this book
          const { data: fullData } = await supabase
            .from('commentaries')
            .select('id, commentary_text, verse_id, scope, bible_verses:bible_verses!commentaries_verse_id_fkey!inner(chapter, verse, bible_books!inner(name, book_order))')
            .in('id', targetIds)
            .order('verse_id', { ascending: true });

          setBookEntries((fullData || []) as unknown as BookEntry[]);
        } else {
          setBookEntries([]);
        }
        setEntries([]);
        setViewMode('book');
        setCurrentPage(0);
        setLoading(false);
        return;
      }

      // Fall back to verse-scope
      let query = supabase
        .from('commentaries')
        .select('id, commentary_text, verse_id, language, year_written, scope, bible_verses:bible_verses!commentaries_verse_id_fkey!inner(chapter, verse, text_sv, bible_books!inner(name, abbreviation, book_order))')
        .eq('author_id', authorId)
        .neq('scope', 'book')
        .order('verse_id', { ascending: true });

      if (selectedSource) {
        query = query.eq('source_work_id', selectedSource);
      }

      const { data } = await query;
      let items = (data || []) as unknown as CommentaryEntry[];

      items.sort((a, b) => {
        const ao = a.bible_verses.bible_books.book_order;
        const bo = b.bible_verses.bible_books.book_order;
        if (ao !== bo) return ao - bo;
        if (a.bible_verses.chapter !== b.bible_verses.chapter) return a.bible_verses.chapter - b.bible_verses.chapter;
        return a.bible_verses.verse - b.bible_verses.verse;
      });

      if (filterBook) {
        items = items.filter(e => e.bible_verses.bible_books.name === filterBook);
      }
      if (filterChapter) {
        items = items.filter(e => e.bible_verses.chapter === parseInt(filterChapter, 10));
      }

      setEntries(items);
      setBookEntries([]);
      setViewMode('verse');
      setCurrentPage(0);
      } catch {
        setError('Kon verklaringen niet laden.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [authorId, selectedSource, filterBook, filterChapter]);

  // Build pages
  const pages = useMemo((): PageData[] => {
    if (viewMode === 'book' && bookEntries.length > 0) {
      return paginateBookEntries(bookEntries);
    }
    return paginateEntries(entries);
  }, [entries, bookEntries, viewMode]);
  const totalPages = pages.length;

  // Deep link: jump to page containing commentaryId, verseId, or specific page number
  useEffect(() => {
    if (totalPages === 0) return;
    let targetIdx = -1;

    if (deepCommentaryId) {
      targetIdx = pages.findIndex(p => p.entryIds.includes(deepCommentaryId));
    }
    if (targetIdx < 0 && deepVerseId) {
      targetIdx = pages.findIndex(p => p.verseIds.includes(deepVerseId));
    }
    if (targetIdx < 0 && deepPage) {
      const p = parseInt(deepPage, 10) - 1;
      if (p >= 0 && p < totalPages) targetIdx = p;
    }

    if (targetIdx >= 0 && targetIdx !== currentPage) {
      setCurrentPage(targetIdx);
      pageRef.current?.scrollTo({ top: 0, behavior: 'instant' });
    }

    if (targetIdx >= 0 && (deepCommentaryId || deepVerseId)) {
      setHighlight(true);
      const timer = setTimeout(() => setHighlight(false), 5000);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPages, deepVerseId, deepCommentaryId, deepPage]);

  // Load side commentaries for current page's verses (other authors)
  useEffect(() => {
    if (totalPages === 0 || !authorId) { setSideCommentaries([]); return; }

    const pageData = pages[currentPage];
    if (!pageData) return;

    const vids = [...new Set(pageData.verseIds)];
    if (vids.length === 0) return;

    setSideLoading(true);
    supabase
      .from('commentaries')
      .select('id, author_id, verse_id, commentary_text, language, year_written, authors(name, born_year, died_year, era)')
      .in('verse_id', vids)
      .neq('author_id', authorId)
      .order('year_written', { ascending: true })
      .limit(30)
      .then(({ data }) => {
        setSideCommentaries((data || []) as unknown as SideCommentary[]);
        setSideLoading(false);
      });
  }, [currentPage, totalPages, pages, authorId]);

  // Build TOC — use bookIndex for book-mode (covers all books, not just loaded one)
  const toc = useMemo((): TocEntry[] => {
    if (viewMode === 'book' && bookIndex.length > 0) {
      return bookIndex.map(b => ({
        bookName: b.name,
        bookOrder: b.order,
        chapters: [],
      }));
    }
    const map = new Map<string, { order: number; chapters: Set<number> }>();
    entries.forEach((e: CommentaryEntry) => {
      const name = e.bible_verses.bible_books.name;
      const existing = map.get(name);
      if (existing) {
        existing.chapters.add(e.bible_verses.chapter);
      } else {
        map.set(name, {
          order: e.bible_verses.bible_books.book_order,
          chapters: new Set([e.bible_verses.chapter]),
        });
      }
    });
    return Array.from(map.entries())
      .map(([bookName, { order, chapters }]) => ({
        bookName,
        bookOrder: order,
        chapters: Array.from(chapters).sort((a, b) => a - b),
      }))
      .sort((a, b) => a.bookOrder - b.bookOrder);
  }, [entries, bookEntries, viewMode, bookIndex]);

  // Current page label for bookmark — includes author name for clarity
  const currentPageLabel = useMemo(() => {
    if (totalPages === 0) return '';
    const pageData = pages[currentPage];
    const prefix = author?.name ? `${author.name} · ` : '';
    if (!pageData || pageData.blocks.length === 0) return `${prefix}Pagina ${currentPage + 1}`;
    const m = pageData.blocks[0].match(/\x00REF:(.*?)\x00/);
    return m ? `${prefix}${m[1]}` : `${prefix}Pagina ${currentPage + 1}`;
  }, [currentPage, pages, totalPages, author]);

  // Page turning
  const goToPage = useCallback((page: number, direction?: 'left' | 'right') => {
    if (page < 0 || page >= totalPages) return;
    const dir = direction || (page > currentPage ? 'right' : 'left');
    setTurning(dir);
    setTimeout(() => {
      setCurrentPage(page);
      setTurning(null);
      pageRef.current?.scrollTo({ top: 0, behavior: 'instant' });
    }, 280);
  }, [currentPage, totalPages]);

  const prevPage = useCallback(() => goToPage(currentPage - 1, 'left'), [currentPage, goToPage]);
  const nextPage = useCallback(() => goToPage(currentPage + 1, 'right'), [currentPage, goToPage]);

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); prevPage(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); nextPage(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [prevPage, nextPage]);

  // Touch / swipe
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx > 0) prevPage();
      else nextPage();
    }
  };

  // Text selection → save to notes
  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      setSelPopup(null);
      return;
    }
    const text = sel.toString().trim();
    if (text.length < 3) return;
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setSelPopup({ text, x: rect.left + rect.width / 2, y: rect.top - 8 });
  }, []);

  const saveSelection = useCallback(() => {
    if (!selPopup) return;
    const note: SavedNote = {
      text: selPopup.text,
      ref: currentPageLabel,
      authorName: author?.name || '',
      ts: Date.now(),
    };
    const updated = [note, ...blNotes];
    setBlNotes(updated);
    localStorage.setItem(BL_NOTES_KEY, JSON.stringify(updated));
    setSelPopup(null);
    window.getSelection()?.removeAllRanges();
  }, [selPopup, currentPageLabel, author, blNotes]);

  // Dismiss popup on click elsewhere
  useEffect(() => {
    const dismiss = () => setSelPopup(null);
    document.addEventListener('mousedown', dismiss);
    return () => document.removeEventListener('mousedown', dismiss);
  }, []);

  // Jump to page
  const handleJump = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(jumpInput, 10);
    if (p >= 1 && p <= totalPages) {
      goToPage(p - 1);
      setJumpInput('');
    }
  };

  // Navigate TOC
  const navigateToChapter = (bookName: string, chapter: number) => {
    const idx = entries.findIndex(
      e => e.bible_verses.bible_books.name === bookName && e.bible_verses.chapter === chapter
    );
    if (idx >= 0) {
      let charCount = 0;
      let pageIdx = 0;
      for (let i = 0; i < entries.length; i++) {
        const len = entries[i].commentary_text.length + 40;
        if (charCount + len > CHARS_PER_PAGE && charCount > 0) {
          pageIdx++;
          charCount = 0;
        }
        if (i === idx) break;
        charCount += len;
      }
      goToPage(pageIdx);
    }
    setTocOpen(false);
  };

  // Filter helpers
  const setFilter = (boek?: string, hfst?: string) => {
    const params = new URLSearchParams(searchParams);
    if (boek) params.set('boek', boek); else params.delete('boek');
    if (hfst) params.set('hfst', hfst); else params.delete('hfst');
    setSearchParams(params, { replace: true });
  };

  // Bookmarks
  const addBookmark = () => {
    const bm: Bookmark = { page: currentPage, label: currentPageLabel, ts: Date.now(), authorId: authorId || undefined, authorName: author?.name || undefined };
    const updated = [...bookmarks.filter(b => !(b.page === currentPage && b.authorId === authorId)), bm];
    setBookmarks(updated);
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated));
  };

  const removeBookmark = (page: number) => {
    const updated = bookmarks.filter(b => b.page !== page);
    setBookmarks(updated);
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated));
  };

  const isBookmarked = bookmarks.some(b => b.page === currentPage);

  if (loading) {
    return (
      <div className="bl-layout">
        <div className="bl-header-bar">
          <Link to="/oudvaders" className="bl-back">{'\u2039'} Terug</Link>
          <span className="bl-header-title">Boeklezer</span>
        </div>
        <div className="bl-center"><div className="loader"><div className="spinner" /></div></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bl-layout">
        <div className="bl-header-bar">
          <Link to="/oudvaders" className="bl-back">{'\u2039'} Terug</Link>
          <span className="bl-header-title">Boeklezer</span>
        </div>
        <div className="bl-center"><div className="error-box">{error}</div></div>
      </div>
    );
  }

  const pageData = pages[currentPage];
  const pageBlocks = pageData?.blocks || [];
  const currentWork = sourceWorks.find(w => w.id === selectedSource);

  return (
    <div className="bl-layout">
      {/* Compact header */}
      <div className="bl-header-bar">
        <Link to="/oudvaders" className="bl-back">{'\u2039'}</Link>

        {sourceWorks.length > 1 && (
          <select
            className="bl-source-select"
            value={selectedSource || ''}
            onChange={e => setSelectedSource(e.target.value)}
          >
            {sourceWorks.map(sw => (
              <option key={sw.id} value={sw.id}>
                {sw.title} {sw.year_published ? `(${sw.year_published})` : ''}
              </option>
            ))}
          </select>
        )}

        {filterBook && (
          <span className="bl-pill">
            {filterBook}{filterChapter ? ` ${filterChapter}` : ''}
            <button onClick={() => setFilter()} className="bl-pill-close">{'\u00d7'}</button>
          </span>
        )}

        <div className="bl-header-spacer" />

        {/* Page nav inline */}
        {totalPages > 1 && (
          <div className="bl-nav-inline">
            <button className="bl-nav-sm" onClick={prevPage} disabled={currentPage === 0}>{'\u2039'}</button>
            <form onSubmit={handleJump} className="bl-jump">
              <input
                type="text"
                inputMode="numeric"
                className="bl-jump-input"
                placeholder={`${currentPage + 1}`}
                value={jumpInput}
                onChange={e => setJumpInput(e.target.value.replace(/\D/g, ''))}
              />
              <span className="bl-jump-total">/{totalPages}</span>
            </form>
            <button className="bl-nav-sm" onClick={nextPage} disabled={currentPage >= totalPages - 1}>{'\u203A'}</button>
          </div>
        )}

        <button className="bl-toc-btn" onClick={() => setTocOpen(!tocOpen)}>
          {tocOpen ? '\u2715' : '\u2630'}
        </button>
      </div>

      {/* TOC Drawer */}
      {tocOpen && (
        <div className="bl-toc-overlay" onClick={() => setTocOpen(false)}>
          <div className="bl-toc-drawer" onClick={e => e.stopPropagation()}>
            <div className="bl-toc-header">Inhoud</div>
            <div className="bl-toc-list">
              {toc.map(t => (
                <div key={t.bookName} className="bl-toc-book">
                  <div
                    className={`bl-toc-book-name ${filterBook === t.bookName ? 'bl-toc-active' : ''}`}
                    onClick={() => { setFilter(t.bookName); setTocOpen(false); }}
                  >
                    {t.bookName}
                  </div>
                  <div className="bl-toc-chapters">
                    {t.chapters.map(ch => (
                      <button
                        key={ch}
                        className="bl-toc-ch-btn"
                        onClick={() => navigateToChapter(t.bookName, ch)}
                      >
                        {ch}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Three-column body */}
      <div className="bl-body">
        {/* Left sidebar: bookmarks & history */}
        <aside className="bl-sidebar bl-sidebar-left">
          <div className="bl-side-section">
            <div className="bl-side-title">Bladwijzers</div>
            {bookmarks.length === 0 ? (
              <div className="bl-side-empty">Nog geen bladwijzers</div>
            ) : (
              bookmarks.sort((a, b) => a.page - b.page).map(bm => (
                <div key={bm.page} className="bl-side-item" onClick={() => goToPage(bm.page)}>
                  <span className="bl-side-item-label">{bm.label}</span>
                  <span className="bl-side-item-page">p.{bm.page + 1}</span>
                  <button className="bl-side-item-rm" onClick={e => { e.stopPropagation(); removeBookmark(bm.page); }}>{'\u2715'}</button>
                </div>
              ))
            )}
          </div>
          <div className="bl-side-section">
            <div className="bl-side-title">Geschiedenis</div>
            {(() => {
              try {
                const hist = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') as { authorId: string; name: string; ts: number }[];
                return hist.length === 0 ? (
                  <div className="bl-side-empty">Nog geen geschiedenis</div>
                ) : (
                  hist.slice(0, 8).map((h, i) => (
                    <Link key={i} to={`/boeklezer/${h.authorId}`} className="bl-side-item">
                      <span className="bl-side-item-label">{h.name}</span>
                    </Link>
                  ))
                );
              } catch { return <div className="bl-side-empty">-</div>; }
            })()}
          </div>
          {blNotes.length > 0 && (
            <div className="bl-side-section">
              <div className="bl-side-title">Notities</div>
              {blNotes.slice(0, 10).map((n, i) => (
                <div key={i} className="bl-side-note">
                  <div className="bl-side-note-ref">{n.ref}</div>
                  <div className="bl-side-note-text">{truncate(n.text, 80)}</div>
                  <button className="bl-side-item-rm" onClick={() => {
                    const updated = blNotes.filter((_, j) => j !== i);
                    setBlNotes(updated);
                    localStorage.setItem(BL_NOTES_KEY, JSON.stringify(updated));
                  }}>{'\u2715'}</button>
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* Center: the parchment page */}
        <div className="bl-center">
          <div
            ref={pageRef}
            className={`bl-page ${turning === 'right' ? 'bl-turn-right' : ''} ${turning === 'left' ? 'bl-turn-left' : ''}`}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            onMouseUp={handleMouseUp}
          >
            {/* Page header */}
            <div className="bl-page-head">
              <span className="bl-head-rule" />
              <span className="bl-head-title">{currentWork?.title || author?.name || ''}</span>
              <button
                className={`bl-bookmark-btn ${isBookmarked ? 'bl-bookmarked' : ''}`}
                onClick={addBookmark}
                title="Bladwijzer"
                aria-label="Bladwijzer"
              >
                <svg width="20" height="24" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 3C5 2.44772 5.44772 2 6 2H14C14.5523 2 15 2.44772 15 3V17.5L10 14L5 17.5V3Z"
                    fill={isBookmarked ? 'var(--accent)' : 'none'}
                    stroke={isBookmarked ? 'var(--accent)' : 'var(--text-muted)'}
                    strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className={`bl-content ${highlight ? 'bl-highlight' : ''}`}>
              {totalPages === 0 ? (
                <div className="bl-empty">
                  <p>Geen verklaringen gevonden.</p>
                  <p className="bl-empty-hint">Selecteer een ander bronwerk of verwijder het filter.</p>
                </div>
              ) : pageData?.mode === 'book' ? (
                pageBlocks.map((block, idx) => renderBookBlock(block, idx))
              ) : (
                pageBlocks.map((block, idx) => renderBlock(block, idx))
              )}
            </div>

            {/* Page footer with prev/next */}
            <div className="bl-page-foot">
              <span className="bl-foot-rule" />
              <div className="bl-foot-nav">
                {currentPage > 0 && (
                  <button className="bl-foot-btn" onClick={prevPage}>{'\u2039'} Vorige</button>
                )}
                <span className="bl-page-num">{totalPages > 0 ? currentPage + 1 : '\u2014'}</span>
                {currentPage < totalPages - 1 && (
                  <button className="bl-foot-btn" onClick={nextPage}>Volgende {'\u203A'}</button>
                )}
              </div>
              <span className="bl-foot-rule" />
            </div>
          </div>

          {/* Selection popup */}
          {selPopup && (
            <div
              className="bl-sel-popup"
              style={{ left: selPopup.x, top: selPopup.y }}
              onMouseDown={e => e.stopPropagation()}
            >
              <button className="bl-sel-save" onClick={saveSelection}>
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
                  <path d="M5 3C5 2.44772 5.44772 2 6 2H14C14.5523 2 15 2.44772 15 3V17.5L10 14L5 17.5V3Z" />
                </svg>
                Opslaan in notities
              </button>
            </div>
          )}
        </div>

        {/* Right sidebar: other authors' commentaries */}
        <aside className="bl-sidebar bl-sidebar-right">
          <div className="bl-side-section">
            <div className="bl-side-title">Andere verklaringen</div>
            {sideLoading ? (
              <div className="bl-side-empty">Laden...</div>
            ) : sideCommentaries.length === 0 ? (
              <div className="bl-side-empty">Geen andere verklaringen voor deze verzen</div>
            ) : (() => {
              // Group by era, sort eras, sort authors within era
              const byEra = new Map<string, SideCommentary[]>();
              for (const sc of sideCommentaries) {
                const era = sc.authors?.era || 'Overig';
                if (!byEra.has(era)) byEra.set(era, []);
                byEra.get(era)!.push(sc);
              }
              const sortedEras = Array.from(byEra.keys()).sort((a, b) => {
                const ai = ERA_ORDER.indexOf(a);
                const bi = ERA_ORDER.indexOf(b);
                return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
              });
              return sortedEras.map(era => (
                <div key={era} className="bl-side-era-group">
                  <div className="bl-side-era-label" style={{ color: ERA_COLORS[era] || 'var(--text-faint)' }}>{era}</div>
                  {byEra.get(era)!.map(sc => (
                    <Link key={sc.id} to={`/boeklezer/${sc.author_id}?verseId=${sc.verse_id}`} className="bl-side-commentary bl-side-link">
                      <div className="bl-side-commentary-author">
                        {sc.authors?.name || 'Onbekend'}
                        {sc.authors?.born_year ? ` (${sc.authors.born_year}\u2013${sc.authors.died_year || '?'})` : ''}
                      </div>
                      <div className="bl-side-commentary-text">
                        {truncate(sc.commentary_text, 300)}
                      </div>
                    </Link>
                  ))}
                </div>
              ));
            })()}
          </div>
        </aside>
      </div>
    </div>
  );
}
