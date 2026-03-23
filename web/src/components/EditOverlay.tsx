import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * EditOverlay — activated via ?edit=1 URL param.
 * Adds click handlers on [data-edit-table] elements that send postMessage to parent (admin iframe).
 * Shows a floating "EDIT MODE" indicator.
 */
export default function EditOverlay() {
  const [searchParams] = useSearchParams();
  const editMode = searchParams.get('edit') === '1';
  const [, setHovered] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!editMode) return;

    function handleClick(e: MouseEvent) {
      const el = (e.target as HTMLElement).closest('[data-edit-table]') as HTMLElement | null;
      if (!el) return;

      e.preventDefault();
      e.stopPropagation();

      const table = el.dataset.editTable!;
      const id = el.dataset.editId!;
      const col = el.dataset.editCol!;
      const label = el.dataset.editLabel || '';
      const text = el.innerText || '';

      window.parent.postMessage({
        type: 'si-edit',
        table,
        id,
        col,
        label,
        text,
      }, '*');
    }

    function handleMouseOver(e: MouseEvent) {
      const el = (e.target as HTMLElement).closest('[data-edit-table]') as HTMLElement | null;
      if (el) {
        el.classList.add('edit-highlight');
        setHovered(el);
      }
    }

    function handleMouseOut(e: MouseEvent) {
      const el = (e.target as HTMLElement).closest('[data-edit-table]') as HTMLElement | null;
      if (el) {
        el.classList.remove('edit-highlight');
        setHovered(null);
      }
    }

    document.addEventListener('click', handleClick, true);
    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);

    return () => {
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
    };
  }, [editMode]);

  // Listen for refresh commands from parent
  useEffect(() => {
    if (!editMode) return;
    function handleMessage(e: MessageEvent) {
      if (e.data?.type === 'si-refresh') {
        window.location.reload();
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [editMode]);

  if (!editMode) return null;

  return (
    <div className="edit-mode-badge">
      EDIT MODE
    </div>
  );
}
