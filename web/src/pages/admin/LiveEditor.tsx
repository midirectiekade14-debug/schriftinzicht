import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';

interface EditTarget {
  table: string;
  id: string;
  col: string;
  label: string;
}

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

export default function LiveEditor() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [target, setTarget] = useState<EditTarget | null>(null);
  const [editText, setEditText] = useState('');
  const [originalText, setOriginalText] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [iframePath, setIframePath] = useState('/bijbel/1/1?name=Genesis');
  const [font, setFont] = useState(FONTS[0].value);
  const [fontSize, setFontSize] = useState(SIZES[1].value);
  const [fontColor, setFontColor] = useState(COLORS[0].value);

  // Listen for edit messages from iframe
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.type !== 'si-edit') return;
      const { table, id, col, label } = e.data;
      loadRecord(table, id, col, label);
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  async function loadRecord(table: string, id: string, col: string, label: string) {
    setLoading(true);
    setMsg('');
    const { data, error } = await supabase.from(table).select(col).eq('id', id).single();
    if (error) {
      setMsg(`Fout bij laden: ${error.message}`);
      setLoading(false);
      return;
    }
    const text = (data as unknown as Record<string, string>)?.[col] || '';
    setTarget({ table, id, col, label });
    setEditText(text);
    setOriginalText(text);
    setLoading(false);
  }

  async function save() {
    if (!target) return;
    setSaving(true);
    setMsg('');
    const { error } = await supabase.from(target.table).update({ [target.col]: editText }).eq('id', target.id);
    if (error) {
      setMsg(`Fout: ${error.message}`);
    } else {
      setMsg('Opgeslagen!');
      setOriginalText(editText);
      // Refresh iframe to show changes
      iframeRef.current?.contentWindow?.postMessage({ type: 'si-refresh' }, '*');
    }
    setSaving(false);
  }

  function discard() {
    setEditText(originalText);
    setMsg('');
  }

  const hasChanges = editText !== originalText;
  const baseUrl = window.location.origin + '/schriftinzicht';

  const quickLinks = [
    { label: 'Zoeken', path: '/zoeken' },
    { label: 'Bijbel', path: '/bijbel/1/1?name=Genesis' },
    { label: 'Catechismus', path: '/catechismus' },
    { label: 'NGB', path: '/belijdenis/ngb' },
    { label: 'DL', path: '/belijdenis/dl' },
    { label: 'Oudvaders', path: '/oudvaders' },
  ];

  function navigateIframe(path: string) {
    setIframePath(path);
  }

  return (
    <div className="adm-live">
      {/* Quick navigation */}
      <div className="adm-live-nav">
        {quickLinks.map(l => (
          <button
            key={l.path}
            className={`adm-tab${iframePath === l.path ? ' active' : ''}`}
            onClick={() => navigateIframe(l.path)}
          >
            {l.label}
          </button>
        ))}
        <div className="adm-live-url">
          <input
            value={iframePath}
            onChange={e => setIframePath(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && navigateIframe(iframePath)}
            placeholder="/bijbel/genesis/1"
          />
          <button onClick={() => navigateIframe(iframePath)}>Ga</button>
        </div>
      </div>

      <div className="adm-live-split">
        {/* Left: site preview */}
        <div className="adm-live-preview">
          <iframe
            ref={iframeRef}
            src={`${baseUrl}${iframePath}${iframePath.includes('?') ? '&' : '?'}edit=1`}
            key={iframePath}
            title="Site preview"
          />
        </div>

        {/* Right: editor */}
        <div className="adm-live-editor">
          {!target && !loading && (
            <div className="adm-live-hint">
              <div className="adm-live-hint-icon">👈</div>
              <p>Klik op tekst in de preview om te bewerken.</p>
              <p className="adm-live-hint-sub">Bewerkbare elementen lichten op als je erover hovert.</p>
            </div>
          )}

          {loading && <div className="adm-section-loading"><div className="spinner" /></div>}

          {target && !loading && (
            <>
              <div className="adm-live-target">
                <span className="adm-live-target-label">{target.label}</span>
                <span className="adm-live-target-meta">{target.table} → {target.col}</span>
              </div>

              {/* Huisstijl opties */}
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

              <textarea
                className="adm-textarea"
                value={editText}
                onChange={e => setEditText(e.target.value)}
                rows={20}
                style={{ fontFamily: font, fontSize, color: fontColor }}
              />

              <div className="adm-editor-footer">
                <button className="adm-save" onClick={save} disabled={saving || !hasChanges}>
                  {saving ? 'Opslaan…' : 'Opslaan'}
                </button>
                {hasChanges && (
                  <button className="adm-back" onClick={discard}>Ongedaan maken</button>
                )}
                {msg && <span className={msg.startsWith('Fout') ? 'adm-msg-err' : 'adm-msg-ok'}>{msg}</span>}
                <span className="adm-char-count">{editText.length} tekens</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
