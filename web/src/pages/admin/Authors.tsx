import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface Author {
  id: string;
  name: string;
  name_original: string | null;
  born_year: number | null;
  died_year: number | null;
  era: string | null;
  tradition: string | null;
  biography: string | null;
  country: string | null;
  portrait_url: string | null;
}

const EMPTY_AUTHOR: Omit<Author, 'id'> = {
  name: '', name_original: null, born_year: null, died_year: null,
  era: null, tradition: null, biography: null, country: null, portrait_url: null,
};

const ERA_OPTIONS = ['', 'Reformatie', 'Nadere Reformatie', 'Puriteins', '18e eeuw', '19e eeuw', 'Modern'];
const TRADITION_OPTIONS = ['', 'Gereformeerd', 'Luthers', 'Anglicaans', 'Puritein', 'Baptist'];

export default function Authors() {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Author | null>(null);
  const [form, setForm] = useState<Omit<Author, 'id'>>(EMPTY_AUTHOR);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [searchQ, setSearchQ] = useState('');

  useEffect(() => { loadAuthors(); }, []);

  async function loadAuthors() {
    setLoading(true);
    const { data } = await supabase.from('authors').select('*').order('name');
    setAuthors(data || []);
    setLoading(false);
  }

  function startEdit(author: Author) {
    setEditing(author);
    setForm({ ...author });
    setIsNew(false);
    setMsg('');
  }

  function startNew() {
    setEditing(null);
    setForm({ ...EMPTY_AUTHOR });
    setIsNew(true);
    setMsg('');
  }

  function backToList() {
    setEditing(null);
    setIsNew(false);
    setMsg('');
  }

  async function save() {
    if (!form.name.trim()) { setMsg('Naam is verplicht'); return; }
    setSaving(true); setMsg('');

    if (isNew) {
      const { error } = await supabase.from('authors').insert([form]);
      if (error) setMsg(`Fout: ${error.message}`);
      else { setMsg('Auteur aangemaakt!'); loadAuthors(); backToList(); }
    } else if (editing) {
      const { error } = await supabase.from('authors').update(form).eq('id', editing.id);
      if (error) setMsg(`Fout: ${error.message}`);
      else {
        setMsg('Opgeslagen!');
        setAuthors(prev => prev.map(a => a.id === editing.id ? { ...a, ...form } : a));
      }
    }
    setSaving(false);
  }

  async function deleteAuthor() {
    if (!editing) return;
    if (!confirm(`Weet je zeker dat je "${editing.name}" wilt verwijderen?`)) return;
    setSaving(true);
    const { error } = await supabase.from('authors').delete().eq('id', editing.id);
    if (error) setMsg(`Fout: ${error.message}`);
    else { setMsg('Verwijderd'); loadAuthors(); backToList(); }
    setSaving(false);
  }

  const filtered = searchQ
    ? authors.filter(a => a.name.toLowerCase().includes(searchQ.toLowerCase()))
    : authors;

  if (loading) return <div className="adm-section-loading"><div className="spinner" /></div>;

  // Edit / New form
  if (editing || isNew) {
    return (
      <div className="adm-author-form">
        <div className="adm-editor-top">
          <button className="adm-back" onClick={backToList}>← Terug</button>
          <span className="adm-editor-title">{isNew ? 'Nieuwe auteur' : `${editing!.name} bewerken`}</span>
        </div>

        <div className="adm-form-grid">
          <label>
            <span>Naam *</span>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </label>
          <label>
            <span>Originele naam</span>
            <input value={form.name_original || ''} onChange={e => setForm({ ...form, name_original: e.target.value || null })} />
          </label>
          <label>
            <span>Geboortejaar</span>
            <input type="number" value={form.born_year || ''} onChange={e => setForm({ ...form, born_year: e.target.value ? parseInt(e.target.value) : null })} />
          </label>
          <label>
            <span>Sterfjaar</span>
            <input type="number" value={form.died_year || ''} onChange={e => setForm({ ...form, died_year: e.target.value ? parseInt(e.target.value) : null })} />
          </label>
          <label>
            <span>Tijdperk</span>
            <select value={form.era || ''} onChange={e => setForm({ ...form, era: e.target.value || null })}>
              {ERA_OPTIONS.map(o => <option key={o} value={o}>{o || '— Kies —'}</option>)}
            </select>
          </label>
          <label>
            <span>Traditie</span>
            <select value={form.tradition || ''} onChange={e => setForm({ ...form, tradition: e.target.value || null })}>
              {TRADITION_OPTIONS.map(o => <option key={o} value={o}>{o || '— Kies —'}</option>)}
            </select>
          </label>
          <label>
            <span>Land</span>
            <input value={form.country || ''} onChange={e => setForm({ ...form, country: e.target.value || null })} />
          </label>
          <label>
            <span>Portret URL</span>
            <input value={form.portrait_url || ''} onChange={e => setForm({ ...form, portrait_url: e.target.value || null })} placeholder="https://..." />
          </label>
          {form.portrait_url && (
            <div className="adm-portrait-preview">
              <img src={form.portrait_url} alt="Portret" onError={e => (e.currentTarget.style.display = 'none')} />
            </div>
          )}
          <label className="adm-form-full">
            <span>Biografie</span>
            <textarea rows={6} value={form.biography || ''} onChange={e => setForm({ ...form, biography: e.target.value || null })} />
          </label>
        </div>

        <div className="adm-editor-footer">
          <button className="adm-save" onClick={save} disabled={saving}>{saving ? 'Opslaan…' : 'Opslaan'}</button>
          {!isNew && <button className="adm-delete" onClick={deleteAuthor} disabled={saving}>Verwijderen</button>}
          {msg && <span className={msg.startsWith('Fout') ? 'adm-msg-err' : 'adm-msg-ok'}>{msg}</span>}
        </div>
      </div>
    );
  }

  // Author list
  return (
    <div className="adm-authors">
      <div className="adm-searchbar">
        <input placeholder="Zoek auteur…" value={searchQ} onChange={e => setSearchQ(e.target.value)} autoFocus />
        <button className="adm-btn-primary" onClick={startNew}>+ Nieuw</button>
      </div>
      <div className="adm-results-info">{filtered.length} auteurs</div>
      <div className="adm-results">
        {filtered.map(a => (
          <div key={a.id} className="adm-result adm-author-row" onClick={() => startEdit(a)}>
            {a.portrait_url && <img className="adm-author-thumb" src={a.portrait_url} alt="" />}
            <div className="adm-author-info">
              <span className="adm-result-label">{a.name}</span>
              <span className="adm-result-preview">
                {[a.born_year && `${a.born_year}–${a.died_year || '?'}`, a.era, a.tradition, a.country].filter(Boolean).join(' · ')}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
