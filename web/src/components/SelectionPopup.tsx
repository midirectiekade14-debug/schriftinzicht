import { useState, useEffect, useCallback, useRef } from 'react';

const NOTES_KEY = 'si-pv-notes';

function loadNotes(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(NOTES_KEY) || '{}'); } catch { return {}; }
}

interface Props {
  /** Current verse reference, e.g. "Genesis 1:1" — used as notes key */
  verseRef: string;
}

export default function SelectionPopup({ verseRef }: Props) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [saved, setSaved] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  const handleSelection = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      // Delay hiding to allow click on popup
      setTimeout(() => {
        if (!popupRef.current?.contains(document.activeElement)) {
          setPos(null);
          setSaved(false);
        }
      }, 200);
      return;
    }

    const text = sel.toString().trim();
    if (text.length < 5) return;

    // Check if selection is inside a commentary or kanttekening
    const anchor = sel.anchorNode?.parentElement;
    const isRelevant = anchor?.closest('.commentary-text, .kant-text, .bl-page-block, .pv-comm-text');
    if (!isRelevant) return;

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    setSelectedText(text);
    setPos({
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
    });
    setSaved(false);
  }, []);

  useEffect(() => {
    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('touchend', handleSelection);
    return () => {
      document.removeEventListener('mouseup', handleSelection);
      document.removeEventListener('touchend', handleSelection);
    };
  }, [handleSelection]);

  const saveToNotes = () => {
    if (!verseRef || !selectedText) return;
    const notes = loadNotes();
    const existing = notes[verseRef] || '';
    const separator = existing ? '\n\n---\n\n' : '';
    notes[verseRef] = existing + separator + selectedText;
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    setSaved(true);
    setTimeout(() => { setPos(null); setSaved(false); }, 1200);
    window.getSelection()?.removeAllRanges();
  };

  if (!pos || !verseRef) return null;

  return (
    <div
      ref={popupRef}
      className="selection-popup"
      style={{
        position: 'fixed',
        left: Math.min(Math.max(pos.x - 80, 8), window.innerWidth - 168),
        top: Math.max(pos.y - 40, 8),
      }}
    >
      {saved ? (
        <span className="selection-popup-saved">Opgeslagen</span>
      ) : (
        <button className="selection-popup-btn" onMouseDown={(e) => { e.preventDefault(); saveToNotes(); }}>
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4V16H16V7L13 4H4Z" />
            <path d="M8 4V8H12" />
            <line x1="7" y1="12" x2="13" y2="12" />
            <line x1="7" y1="14" x2="11" y2="14" />
          </svg>
          Sla op in notities
        </button>
      )}
    </div>
  );
}
