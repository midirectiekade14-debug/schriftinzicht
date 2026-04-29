import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * EditOverlay — activated via ?edit=1 URL param AND a parent-window handshake.
 *
 * The handshake (security audit L-3) prevents the edit-mode UI from breaking
 * the page when a casual visitor lands on a shared `?edit=1` link. The page
 * announces si-edit-ready to its parent on mount; the parent (admin tooling)
 * must reply with si-edit-on before clicks/hover are intercepted. Cross-origin
 * messages are dropped by the browser because targetOrigin = own origin.
 *
 * Adds click handlers on [data-edit-table] elements that send postMessage to
 * the parent admin iframe.
 */
export default function EditOverlay() {
  const [searchParams] = useSearchParams();
  const editRequested = searchParams.get('edit') === '1';
  const [, setHovered] = useState<HTMLElement | null>(null);
  // editMode = parent has confirmed it's an admin context.
  const [editMode, setEditMode] = useState(false);

  // Handshake: ask parent to confirm; only flip to edit-mode if it replies.
  useEffect(() => {
    if (!editRequested) return;
    if (window.parent === window) {
      // Not in an iframe — there's no admin parent to authorise editing.
      return;
    }

    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === 'si-edit-on') setEditMode(true);
      if (e.data?.type === 'si-edit-off') setEditMode(false);
    }
    window.addEventListener('message', onMessage);
    // Tell the parent we're ready and waiting for its si-edit-on.
    window.parent.postMessage({ type: 'si-edit-ready' }, window.location.origin);

    return () => window.removeEventListener('message', onMessage);
  }, [editRequested]);

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
      }, window.location.origin);
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

  // Listen for refresh commands from parent (same-origin only)
  useEffect(() => {
    if (!editMode) return;
    function handleMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
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
