import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import StyleBar from '../../components/admin/StyleBar';

interface CatechismQuestion {
  id: string;
  lord_day: number | null;
  question_number: number;
  question_text: string;
  answer_text: string;
}

export default function Catechism() {
  const [questions, setQuestions] = useState<CatechismQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDay, setFilterDay] = useState<number | null>(null);
  const [editing, setEditing] = useState<CatechismQuestion | null>(null);
  const [editQ, setEditQ] = useState('');
  const [editA, setEditA] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [font, setFont] = useState("'Cormorant Garamond', Georgia, serif");
  const [fontSize, setFontSize] = useState('15px');
  const [fontColor, setFontColor] = useState('var(--text, #e7e1d8)');

  async function loadQuestions() {
    setLoading(true);
    const { data } = await supabase.from('catechism_questions').select('*').order('question_number');
    setQuestions(data || []);
    setLoading(false);
  }

  useEffect(() => { Promise.resolve().then(loadQuestions); }, []);

  function startEdit(q: CatechismQuestion) {
    setEditing(q);
    setEditQ(q.question_text);
    setEditA(q.answer_text);
    setMsg('');
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true); setMsg('');
    const { error } = await supabase.from('catechism_questions')
      .update({ question_text: editQ, answer_text: editA })
      .eq('id', editing.id);
    if (error) setMsg(`Fout: ${error.message}`);
    else {
      setMsg('Opgeslagen!');
      setQuestions(prev => prev.map(q => q.id === editing.id ? { ...q, question_text: editQ, answer_text: editA } : q));
    }
    setSaving(false);
  }

  const lordDays = [...new Set(questions.map(q => q.lord_day).filter(Boolean))].sort((a, b) => a! - b!) as number[];
  const filtered = filterDay ? questions.filter(q => q.lord_day === filterDay) : questions;

  if (loading) return <div className="adm-section-loading"><div className="spinner" /></div>;

  if (editing) {
    return (
      <div className="adm-catechism-edit">
        <div className="adm-editor-top">
          <button className="adm-back" onClick={() => { setEditing(null); setMsg(''); }}>← Terug</button>
          <span className="adm-editor-title">Vraag {editing.question_number} (Zondag {editing.lord_day})</span>
        </div>

        <StyleBar font={font} setFont={setFont} fontSize={fontSize} setFontSize={setFontSize} fontColor={fontColor} setFontColor={setFontColor} />

        <label className="adm-form-label">
          <span>Vraag</span>
          <textarea className="adm-textarea" value={editQ} onChange={e => setEditQ(e.target.value)} rows={4}
            style={{ fontFamily: font, fontSize, color: fontColor }} />
        </label>

        <label className="adm-form-label">
          <span>Antwoord</span>
          <textarea className="adm-textarea" value={editA} onChange={e => setEditA(e.target.value)} rows={10}
            style={{ fontFamily: font, fontSize, color: fontColor }} />
        </label>

        <div className="adm-editor-footer">
          <button className="adm-save" onClick={saveEdit} disabled={saving}>{saving ? 'Opslaan…' : 'Opslaan'}</button>
          {msg && <span className={msg.startsWith('Fout') ? 'adm-msg-err' : 'adm-msg-ok'}>{msg}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="adm-catechism">
      <div className="adm-searchbar">
        <select value={filterDay || ''} onChange={e => setFilterDay(e.target.value ? parseInt(e.target.value) : null)}>
          <option value="">Alle zondagen ({questions.length} vragen)</option>
          {lordDays.map(d => (
            <option key={d} value={d}>Zondag {d} ({questions.filter(q => q.lord_day === d).length} vragen)</option>
          ))}
        </select>
      </div>

      <div className="adm-results-info">{filtered.length} vragen</div>
      <div className="adm-results">
        {filtered.map(q => (
          <div key={q.id} className="adm-result" onClick={() => startEdit(q)}>
            <span className="adm-result-label">Vr. {q.question_number} (Zondag {q.lord_day})</span>
            <span className="adm-result-preview">{q.question_text.slice(0, 180)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
