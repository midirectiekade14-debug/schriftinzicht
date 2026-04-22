import { useCallback, useEffect, useState } from 'react';

const KEY = 'si-theme';
const EVT = 'si:theme-change';

function readTheme(): 'light' | 'dark' {
  try {
    return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

function applyTheme(theme: 'light' | 'dark') {
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

export default function useTheme() {
  const [theme, setThemeState] = useState<'light' | 'dark'>(readTheme);

  useEffect(() => {
    applyTheme(theme);
    try { localStorage.setItem(KEY, theme); } catch { /* noop */ }
  }, [theme]);

  useEffect(() => {
    const onChange = () => setThemeState(readTheme());
    window.addEventListener(EVT, onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener(EVT, onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);

  const setTheme = useCallback((next: 'light' | 'dark') => {
    setThemeState(next);
    try { localStorage.setItem(KEY, next); } catch { /* noop */ }
    applyTheme(next);
    window.dispatchEvent(new CustomEvent(EVT));
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme, setTheme]);

  return { theme, setTheme, toggle, isLight: theme === 'light' };
}
