const FONTS = [
  { label: 'Serif', value: "'Cormorant Garamond', Georgia, serif" },
  { label: 'Sans', value: "'Libre Franklin', system-ui, sans-serif" },
];

const SIZES = [
  { label: 'S', value: '13px' },
  { label: 'M', value: '15px' },
  { label: 'L', value: '18px' },
  { label: 'XL', value: '22px' },
];

const COLORS = [
  { label: 'Tekst', value: 'var(--text, #e7e1d8)' },
  { label: 'Accent', value: '#C4956A' },
  { label: 'Gedempt', value: 'var(--text-muted, #8a8278)' },
];

interface StyleBarProps {
  font: string;
  setFont: (v: string) => void;
  fontSize: string;
  setFontSize: (v: string) => void;
  fontColor: string;
  setFontColor: (v: string) => void;
}

export default function StyleBar({ font, setFont, fontSize, setFontSize, fontColor, setFontColor }: StyleBarProps) {
  return (
    <div className="adm-style-bar">
      <div className="adm-style-group">
        <label>Font</label>
        <div className="adm-style-btns">
          {FONTS.map(f => (
            <button key={f.label} className={font === f.value ? 'active' : ''} onClick={() => setFont(f.value)}
              style={{ fontFamily: f.value }}>{f.label}</button>
          ))}
        </div>
      </div>
      <div className="adm-style-group">
        <label>Grootte</label>
        <div className="adm-style-btns">
          {SIZES.map(s => (
            <button key={s.label} className={fontSize === s.value ? 'active' : ''} onClick={() => setFontSize(s.value)}>{s.label}</button>
          ))}
        </div>
      </div>
      <div className="adm-style-group">
        <label>Kleur</label>
        <div className="adm-style-btns">
          {COLORS.map(c => (
            <button key={c.label} className={fontColor === c.value ? 'active' : ''} onClick={() => setFontColor(c.value)}
              style={{ color: c.value }}>{c.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
