import { useEffect } from 'react';

export default function useKeyboardShortcuts() {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const active = document.activeElement;
      const isInput =
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        (active as HTMLElement)?.isContentEditable;

      // Escape always works
      if (e.key === 'Escape') {
        (active as HTMLElement)?.blur?.();
        return;
      }

      // Other shortcuts only when not in an input
      if (isInput) return;

      if (e.key === '/') {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>('.search-bar input');
        searchInput?.focus();
        return;
      }

      if (e.key === 'ArrowLeft') {
        const prevBtn = document.querySelector<HTMLButtonElement>('.verse-nav-btn:first-child');
        if (prevBtn) {
          e.preventDefault();
          prevBtn.click();
        }
        return;
      }

      if (e.key === 'ArrowRight') {
        const nextBtn = document.querySelector<HTMLButtonElement>('.verse-nav-btn:last-child');
        if (nextBtn) {
          e.preventDefault();
          nextBtn.click();
        }
        return;
      }
    }

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
