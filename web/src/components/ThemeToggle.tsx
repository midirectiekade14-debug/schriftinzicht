import { useState, useEffect } from 'react';

const KEY = 'si-theme';

export default function ThemeToggle() {
  const [light, setLight] = useState(() => {
    try { return localStorage.getItem(KEY) === 'light'; }
    catch { return false; }
  });

  useEffect(() => {
    if (light) {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem(KEY, 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem(KEY, 'dark');
    }
  }, [light]);

  return (
    <button
      className="theme-toggle-fab"
      onClick={() => setLight(!light)}
      title={light ? 'Donker thema' : 'Licht thema'}
    >
      {light ? '\u263D' : '\u2600'}
    </button>
  );
}
