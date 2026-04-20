import { useState, useEffect, useRef } from 'react';
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

interface SourceWork {
  id: string;
  title: string;
  year: number | null;
  commentary_count?: number;
}

export default function Authors() {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Author | null>(null);
  const [form, setForm] = useState<Omit<Author, 'id'>>(EMPTY_AUTHOR);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [works, setWorks] = useState<SourceWork[]>([]);
  const [sermonCount, setSermonCount] = useState(0);
  const [worksLoading, setWorksLoading] = useState(false);
  const [portraitZoom, setPortraitZoom] = useState(false);
  const [imgScale, setImgScale] = useState(1);
  const [imgPos, setImgPos] = useState({ x: 0, y: 0 });
  const [imgDragging, setImgDragging] = useState(false);
  const imgDrag = useRef<{ dragging: boolean; startX: number; startY: number; origX: number; origY: number }>({ dragging: false, startX: 0, startY: 0, origX: 0, origY: 0 });

  async function loadAuthors() {
    setLoading(true);
    const { data } = await supabase.from('authors').select('*').order('name');
    setAuthors(data || []);
    setLoading(false);
  }

  useEffect(() => { Promise.resolve().then(loadAuthors); }, []);

  async function loadAuthorWorks(authorId: string) {
    setWorksLoading(true);
    const [worksRes, sermonsRes] = await Promise.all([
      supabase.from('source_works').select('id, title, year').eq('author_id', authorId).order('year'),
      supabase.from('sermons').select('*', { count: 'exact', head: true }).eq('author_id', authorId),
    ]);
    const worksData = worksRes.data || [];
    // Get commentary counts per work
    const withCounts = await Promise.all(
      worksData.map(async (w: SourceWork) => {
        const { count } = await supabase.from('commentaries').select('*', { count: 'exact', head: true }).eq('source_work_id', w.id);
        return { ...w, commentary_count: count || 0 };
      })
    );
    setWorks(withCounts);
    setSermonCount(sermonsRes.count || 0);
    setWorksLoading(false);
  }

  function startEdit(author: Author) {
    setEditing(author);
    setForm({ ...author });
    setIsNew(false);
    setMsg('');
    setWorks([]);
    setSermonCount(0);
    loadAuthorWorks(author.id);
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
              <img
                src={form.portrait_url}
                alt="Portret"
                onError={e => (e.currentTarget.style.display = 'none')}
                onClick={() => { setPortraitZoom(true); setImgScale(1); setImgPos({ x: 0, y: 0 }); }}
                style={{ cursor: 'zoom-in' }}
                title="Klik om te vergroten"
              />
            </div>
          )}
          {portraitZoom && form.portrait_url && (
            <div className="adm-portrait-modal" onClick={() => setPortraitZoom(false)}>
              <div className="adm-portrait-modal-content" onClick={e => e.stopPropagation()}>
                <div
                  className="adm-portrait-zoom-area"
                  onWheel={e => { e.preventDefault(); setImgScale(s => Math.max(0.5, Math.min(5, s + (e.deltaY > 0 ? -0.2 : 0.2)))); }}
                  onMouseDown={e => { imgDrag.current = { dragging: true, startX: e.clientX, startY: e.clientY, origX: imgPos.x, origY: imgPos.y }; setImgDragging(true); }}
                  onMouseMove={e => { if (!imgDrag.current.dragging) return; setImgPos({ x: imgDrag.current.origX + e.clientX - imgDrag.current.startX, y: imgDrag.current.origY + e.clientY - imgDrag.current.startY }); }}
                  onMouseUp={() => { imgDrag.current.dragging = false; setImgDragging(false); }}
                  onMouseLeave={() => { imgDrag.current.dragging = false; setImgDragging(false); }}
                >
                  <img
                    src={form.portrait_url}
                    alt="Portret"
                    style={{ transform: `translate(${imgPos.x}px, ${imgPos.y}px) scale(${imgScale})`, cursor: imgDragging ? 'grabbing' : 'grab' }}
                    draggable={false}
                  />
                </div>
                <div className="adm-portrait-zoom-controls">
                  <button onClick={() => setImgScale(s => Math.max(0.5, s - 0.25))}>−</button>
                  <span>{Math.round(imgScale * 100)}%</span>
                  <button onClick={() => setImgScale(s => Math.min(5, s + 0.25))}>+</button>
                  <button onClick={() => { setImgScale(1); setImgPos({ x: 0, y: 0 }); }}>Reset</button>
                  <button onClick={() => setPortraitZoom(false)}>Sluiten</button>
                </div>
              </div>
            </div>
          )}
          <label className="adm-form-full">
            <span>Biografie</span>
            <textarea rows={6} value={form.biography || ''} onChange={e => setForm({ ...form, biography: e.target.value || null })} />
          </label>
        </div>

        {!isNew && editing && (
          <div className="adm-author-works">
            <h3>Werken &amp; Content</h3>
            {worksLoading ? (
              <div className="adm-section-loading"><div className="spinner" /></div>
            ) : (
              <>
                <div className="adm-author-works-summary">
                  <span>{works.length} werken</span>
                  <span>{works.reduce((s, w) => s + (w.commentary_count || 0), 0)} verklaringen</span>
                  <span>{sermonCount} preken</span>
                </div>
                {works.length > 0 && (
                  <div className="adm-results">
                    {works.map(w => (
                      <div key={w.id} className="adm-result" style={{ cursor: 'default' }}>
                        <span className="adm-result-label">{w.title}</span>
                        <span className="adm-result-preview">
                          {[w.year && `${w.year}`, `${w.commentary_count || 0} verklaringen`].filter(Boolean).join(' · ')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

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
