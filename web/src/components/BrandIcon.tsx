export default function BrandIcon() {
  return (
    <svg viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bi-accent" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E7E1D8" />
          <stop offset="100%" stopColor="#C4956A" />
        </linearGradient>
        <linearGradient id="bi-pageL" x1="1" y1="0" x2="0" y2="0.2">
          <stop offset="0%" stopColor="#D4CBC0" stopOpacity={0.12} />
          <stop offset="100%" stopColor="#D4CBC0" stopOpacity={0.03} />
        </linearGradient>
        <linearGradient id="bi-pageR" x1="0" y1="0" x2="1" y2="0.2">
          <stop offset="0%" stopColor="#D4CBC0" stopOpacity={0.12} />
          <stop offset="100%" stopColor="#D4CBC0" stopOpacity={0.03} />
        </linearGradient>
        <linearGradient id="bi-coverL" x1="1" y1="0" x2="0" y2="0.4">
          <stop offset="0%" stopColor="#C4956A" stopOpacity={0.22} />
          <stop offset="100%" stopColor="#8B6840" stopOpacity={0.06} />
        </linearGradient>
        <linearGradient id="bi-coverR" x1="0" y1="0" x2="1" y2="0.4">
          <stop offset="0%" stopColor="#C4956A" stopOpacity={0.22} />
          <stop offset="100%" stopColor="#8B6840" stopOpacity={0.06} />
        </linearGradient>
        <radialGradient id="bi-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#C4956A" stopOpacity={0.12} />
          <stop offset="60%" stopColor="#C4956A" stopOpacity={0.04} />
          <stop offset="100%" stopColor="#C4956A" stopOpacity={0} />
        </radialGradient>
      </defs>

      <circle cx={250} cy={250} r={250} fill="url(#bi-glow)" />

      <g transform="translate(250, 155)">
        <rect x="-3" y="-130" width="6" height="260" rx="3" fill="url(#bi-accent)" />
        <rect x="-72" y="-40" width="144" height="6" rx="3" fill="url(#bi-accent)" />
        <circle cx={0} cy={-37} r={4.5} fill="url(#bi-accent)" opacity={0.4} />
      </g>

      <g transform="translate(250, 365)">
        <path d="M-6 -55 C-6 -55 -80 -65 -95 -50 L-99 58 C-82 45 -6 55 -6 55 Z" fill="url(#bi-coverL)" stroke="#C4956A" strokeWidth={1.5} strokeLinejoin="round" />
        <path d="M6 -55 C6 -55 80 -65 95 -50 L99 58 C82 45 6 55 6 55 Z" fill="url(#bi-coverR)" stroke="#C4956A" strokeWidth={1.5} strokeLinejoin="round" />
        <path d="M-4 -48 C-4 -48 -72 -57 -86 -44 L-89 51 C-73 39 -4 47 -4 47 Z" fill="url(#bi-pageL)" stroke="#D4CBC0" strokeWidth={0.5} strokeLinejoin="round" opacity={0.5} />
        <path d="M4 -48 C4 -48 72 -57 86 -44 L89 51 C73 39 4 47 4 47 Z" fill="url(#bi-pageR)" stroke="#D4CBC0" strokeWidth={0.5} strokeLinejoin="round" opacity={0.5} />
        <path d="M0 -57 L0 57" stroke="#C4956A" strokeWidth={2} strokeLinecap="round" opacity={0.5} />
        <line x1={-65} y1={-34} x2={-16} y2={-32} stroke="#D4CBC0" strokeWidth={0.6} opacity={0.13} />
        <line x1={-69} y1={-24} x2={-14} y2={-23} stroke="#D4CBC0" strokeWidth={0.6} opacity={0.13} />
        <line x1={-73} y1={-14} x2={-13} y2={-14} stroke="#D4CBC0" strokeWidth={0.6} opacity={0.11} />
        <line x1={-75} y1={-4} x2={-12} y2={-4} stroke="#D4CBC0" strokeWidth={0.6} opacity={0.11} />
        <line x1={-77} y1={6} x2={-11} y2={6} stroke="#D4CBC0" strokeWidth={0.6} opacity={0.09} />
        <line x1={-78} y1={16} x2={-11} y2={15} stroke="#D4CBC0" strokeWidth={0.6} opacity={0.09} />
        <line x1={-79} y1={26} x2={-10} y2={24} stroke="#D4CBC0" strokeWidth={0.6} opacity={0.07} />
        <line x1={16} y1={-32} x2={65} y2={-34} stroke="#D4CBC0" strokeWidth={0.6} opacity={0.13} />
        <line x1={14} y1={-23} x2={69} y2={-24} stroke="#D4CBC0" strokeWidth={0.6} opacity={0.13} />
        <line x1={13} y1={-14} x2={73} y2={-14} stroke="#D4CBC0" strokeWidth={0.6} opacity={0.11} />
        <line x1={12} y1={-4} x2={75} y2={-4} stroke="#D4CBC0" strokeWidth={0.6} opacity={0.11} />
        <line x1={11} y1={6} x2={77} y2={6} stroke="#D4CBC0" strokeWidth={0.6} opacity={0.09} />
        <line x1={11} y1={15} x2={78} y2={16} stroke="#D4CBC0" strokeWidth={0.6} opacity={0.09} />
        <line x1={10} y1={24} x2={79} y2={26} stroke="#D4CBC0" strokeWidth={0.6} opacity={0.07} />
        <path d="M1 -57 Q9 -7 4 57 Q3 67 7 75" fill="none" stroke="#8B3030" strokeWidth={1.4} opacity={0.35} strokeLinecap="round" />
      </g>
    </svg>
  );
}
