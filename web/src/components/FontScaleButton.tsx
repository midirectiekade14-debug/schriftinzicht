import { useState, useEffect } from 'react';

const LEVELS = [1, 1.1, 1.2, 1.35, 1.5];
const LABELS = ['A', 'A+', 'A++', 'A+++', 'A++++'];
const KEY = 'si-font-scale';

export default function FontScaleButton() {
  const [level, setLevel] = useState(() => {
    try {
      const saved = parseInt(localStorage.getItem(KEY) || '0', 10);
      return saved >= 0 && saved < LEVELS.length ? saved : 0;
    } catch { return 0; }
  });

  useEffect(() => {
    document.documentElement.style.setProperty('--font-scale', String(LEVELS[level]));
    localStorage.setItem(KEY, String(level));
  }, [level]);

  const next = () => setLevel((level + 1) % LEVELS.length);

  return (
    <button className="font-scale-fab" onClick={next} title="Lettergrootte">
      <span className="font-scale-icon">Aa</span>
      <span className="font-scale-level">{LABELS[level]}</span>
    </button>
  );
}
