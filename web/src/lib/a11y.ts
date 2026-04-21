import type { KeyboardEvent, MouseEvent } from 'react';

type Handler = (e?: MouseEvent | KeyboardEvent) => void;

export function clickable(onClick: Handler, opts?: { expanded?: boolean; label?: string }) {
  return {
    role: 'button' as const,
    tabIndex: 0,
    'aria-expanded': opts?.expanded,
    'aria-label': opts?.label,
    onClick,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick(e);
      }
    },
  };
}
