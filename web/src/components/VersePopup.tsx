import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { displayBookName } from '../lib/parseReference';

interface VerseHit {
  id: string;
  book_id: string;
  chapter: number;
  verse: number;
  text_sv: string;
  bible_books: { name: string } | null;
}

interface Props {
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number;
  anchorRect: DOMRect;
  onClose: () => void;
}

export default function VersePopup({ book, chapter, verseStart, verseEnd, anchorRect, onClose }: Props) {
  const [verses, setVerses] = useState<VerseHit[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  const vEnd = verseEnd && verseEnd >= verseStart ? verseEnd : verseStart;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: bookRow } = await supabase
        .from('bible_books')
        .select('id, name')
        .or(`name.eq.${book},abbreviation.eq.${book}`)
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (!bookRow) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('bible_verses')
        .select('id, book_id, chapter, verse, text_sv, bible_books(name)')
        .eq('book_id', bookRow.id)
        .eq('chapter', chapter)
        .gte('verse', verseStart)
        .lte('verse', vEnd)
        .order('verse', { ascending: true });
      if (cancelled) return;
      if (!data || data.length === 0) {
        setNotFound(true);
      } else {
        setVerses(data as unknown as VerseHit[]);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [book, chapter, verseStart, vEnd]);

  // Close on outside click / escape
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const bookId = verses[0]?.book_id;
  const bookName = verses[0]?.bible_books?.name || book;
  const refLabel = `${displayBookName(bookName)} ${chapter}:${verseStart}${vEnd > verseStart ? `\u2013${vEnd}` : ''}`;
  const chapterHref = bookId
    ? `/bijbel/${bookId}/${chapter}?name=${encodeURIComponent(bookName)}&hlStart=${verseStart}&hlEnd=${vEnd}`
    : null;

  // Position: below anchor, clamped
  const popupWidth = 360;
  const popupMaxH = 420;
  const margin = 8;
  let left = anchorRect.left + anchorRect.width / 2 - popupWidth / 2;
  left = Math.max(margin, Math.min(left, window.innerWidth - popupWidth - margin));
  let top = anchorRect.bottom + 8;
  if (top + popupMaxH > window.innerHeight - margin) {
    top = Math.max(margin, anchorRect.top - popupMaxH - 8);
  }

  return (
    <div
      ref={popupRef}
      className="verse-popup"
      style={{ position: 'fixed', top, left, width: popupWidth, maxHeight: popupMaxH }}
      role="dialog"
      aria-label={`Bijbeltekst ${refLabel}`}
    >
      <div className="verse-popup-head">
        <span className="verse-popup-ref">{refLabel}</span>
        <button className="verse-popup-close" onClick={onClose} aria-label="Sluiten">&times;</button>
      </div>
      <div className="verse-popup-body">
        {loading ? (
          <div className="loader"><div className="spinner" /></div>
        ) : notFound ? (
          <div className="empty-text">Tekst niet gevonden.</div>
        ) : (
          <div className="verse-popup-text">
            {verses.map(v => (
              <span key={v.id}>
                <sup className="bijbel-vnum">{v.verse}</sup>
                {v.text_sv}{' '}
              </span>
            ))}
          </div>
        )}
      </div>
      {chapterHref && (
        <div className="verse-popup-foot">
          <Link to={chapterHref} className="verse-popup-link" onClick={onClose}>
            Open hoofdstuk &rsaquo;
          </Link>
        </div>
      )}
    </div>
  );
}
