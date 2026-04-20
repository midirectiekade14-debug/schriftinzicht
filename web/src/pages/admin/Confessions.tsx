import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import StyleBar from '../../components/admin/StyleBar';

interface ConfessionArticle {
  id: number;
  confession: 'NGB' | 'DL';
  section_number: number;
  section_title: string | null;
  article_number: number | null;
  article_title: string | null;
  article_text: string;
  is_rejection: boolean;
}

export default function Confessions() {
  const [articles, setArticles] = useState<ConfessionArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'NGB' | 'DL' | ''>('');
  const [editing, setEditing] = useState<ConfessionArticle | null>(null);
  const [editText, setEditText] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [font, setFont] = useState("'Cormorant Garamond', Georgia, serif");
  const [fontSize, setFontSize] = useState('15px');
  const [fontColor, setFontColor] = useState('var(--text, #e7e1d8)');

  async function loadArticles() {
    setLoading(true);
    const { data } = await supabase.from('confession_articles').select('*').order('confession').order('section_number').order('article_number');
    setArticles(data || []);
    setLoading(false);
  }

  useEffect(() => { Promise.resolve().then(loadArticles); }, []);

  function startEdit(article: ConfessionArticle) {
    setEditing(article);
    setEditText(article.article_text);
    setEditTitle(article.article_title || '');
    setMsg('');
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true); setMsg('');
    const { error } = await supabase.from('confession_articles')
      .update({ article_text: editText, article_title: editTitle || null })
      .eq('id', editing.id);
    if (error) setMsg(`Fout: ${error.message}`);
    else {
      setMsg('Opgeslagen!');
      setArticles(prev => prev.map(a => a.id === editing.id ? { ...a, article_text: editText, article_title: editTitle || null } : a));
      setEditing({ ...editing, article_text: editText, article_title: editTitle || null });
    }
    setSaving(false);
  }

  const filtered = filter ? articles.filter(a => a.confession === filter) : articles;

  if (loading) return <div className="adm-section-loading"><div className="spinner" /></div>;

  if (editing) {
    return (
      <div className="adm-confession-edit">
        <div className="adm-editor-top">
          <button className="adm-back" onClick={() => { setEditing(null); setMsg(''); }}>← Terug</button>
          <span className="adm-editor-title">
            {editing.confession} {editing.is_rejection ? 'Verwerping' : 'Artikel'} {editing.article_number || editing.section_number}
          </span>
        </div>

        <label className="adm-form-label">
          <span>Titel</span>
          <input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Artikeltitel…" />
        </label>

        <StyleBar font={font} setFont={setFont} fontSize={fontSize} setFontSize={setFontSize} fontColor={fontColor} setFontColor={setFontColor} />

        <textarea className="adm-textarea" value={editText} onChange={e => setEditText(e.target.value)} rows={16}
          style={{ fontFamily: font, fontSize, color: fontColor }} />

        <div className="adm-editor-footer">
          <button className="adm-save" onClick={saveEdit} disabled={saving}>{saving ? 'Opslaan…' : 'Opslaan'}</button>
          {msg && <span className={msg.startsWith('Fout') ? 'adm-msg-err' : 'adm-msg-ok'}>{msg}</span>}
          <span className="adm-char-count">{editText.length} tekens</span>
        </div>
      </div>
    );
  }

  return (
    <div className="adm-confessions">
      <div className="adm-content-tabs">
        <button className={`adm-tab${filter === '' ? ' active' : ''}`} onClick={() => setFilter('')}>Alle</button>
        <button className={`adm-tab${filter === 'NGB' ? ' active' : ''}`} onClick={() => setFilter('NGB')}>NGB</button>
        <button className={`adm-tab${filter === 'DL' ? ' active' : ''}`} onClick={() => setFilter('DL')}>Dordtse Leerregels</button>
      </div>

      <div className="adm-results-info">{filtered.length} artikelen</div>
      <div className="adm-results">
        {filtered.map(a => (
          <div key={a.id} className="adm-result" onClick={() => startEdit(a)}>
            <span className="adm-result-label">
              {a.confession} {a.is_rejection ? 'Verw.' : 'Art.'} {a.article_number || a.section_number}
              {a.article_title && ` — ${a.article_title}`}
            </span>
            <span className="adm-result-preview">{a.article_text.slice(0, 180)}…</span>
          </div>
        ))}
      </div>
    </div>
  );
}
