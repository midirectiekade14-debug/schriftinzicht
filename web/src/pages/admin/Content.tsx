import { useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { displayBookName } from '../../lib/parseReference';

type TableName = 'bible_verses' | 'commentaries' | 'kanttekeningen' | 'sermons';

interface TableConfig {
  label: string;
  textCol: string;
  select: string;
}

const TABLES: Record<TableName, TableConfig> = {
  bible_verses: { label: 'Bijbelverzen', textCol: 'text_sv', select: 'id, text_sv, chapter, verse, bible_books(name)' },
  commentaries: { label: 'Verklaringen', textCol: 'commentary_text', select: 'id, commentary_text, year_written, authors(name)' },
  kanttekeningen: { label: 'Kanttekeningen', textCol: 'note_text', select: 'id, note_text, marker, verse_id' },
  sermons: { label: 'Preken', textCol: 'sermon_text', select: 'id, sermon_text, title, year_preached, authors(name)' },
};

const BULK_PATTERNS = [
  { label: 'Afbrekingen (woord-\\n)', find: /(\w)-\n(\w)/g, replace: '$1$2', desc: 'Verwijder woordafbrekingen over regels' },
  { label: 'Dubbele spaties', find: /  +/g, replace: ' ', desc: 'Vervang meervoudige spaties' },
  { label: 'Spatie voor punt/komma', find: / ([.,;:!?])/g, replace: '$1', desc: 'Verwijder spatie voor leestekens' },
  { label: 'Lege regels inkorten', find: /\n{3,}/g, replace: '\n\n', desc: 'Max 1 lege regel' },
];

function getDisplayLabel(row: any, table: TableName): string {
  switch (table) {
    case 'bible_verses': return `${displayBookName(row.bible_books?.name || '')} ${row.chapter}:${row.verse}`;
    case 'commentaries': return `${row.authors?.name || 'Onbekend'} (${row.year_written || '?'})`;
    case 'kanttekeningen': return row.marker ? `[${row.marker}]` : row.id.slice(0, 8);
    case 'sermons': return `${row.authors?.name || ''} — ${row.title || 'Zonder titel'}`;
    default: return row.id;
  }
}

export default function Content() {
  const [table, setTable] = useState<TableName>('bible_verses');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [editRow, setEditRow] = useState<any | null>(null);
  const [editText, setEditText] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [findStr, setFindStr] = useState('');
  const [replaceStr, setReplaceStr] = useState('');
  const [useRegex, setUseRegex] = useState(false);
  const [previewChanges, setPreviewChanges] = useState<{ id: string; label: string; before: string; after: string }[]>([]);

  const doSearch = useCallback(async () => {
    if (!searchQ.trim()) return;
    setLoading(true); setEditRow(null); setSaveMsg('');
    const cfg = TABLES[table];
    const { data } = await supabase.from(table).select(cfg.select).ilike(cfg.textCol, `%${searchQ.trim()}%`).limit(50);
    setRows(data || []);
    setLoading(false);
  }, [table, searchQ]);

  const startEdit = (row: any) => {
    setEditRow(row);
    setEditText(row[TABLES[table].textCol] || '');
    setSaveMsg('');
  };

  const saveEdit = async () => {
    if (!editRow) return;
    setSaving(true); setSaveMsg('');
    const cfg = TABLES[table];
    const { error } = await supabase.from(table).update({ [cfg.textCol]: editText }).eq('id', editRow.id);
    if (error) setSaveMsg(`Fout: ${error.message}`);
    else {
      setSaveMsg('Opgeslagen!');
      setRows(prev => prev.map(r => r.id === editRow.id ? { ...r, [cfg.textCol]: editText } : r));
      setEditRow({ ...editRow, [cfg.textCol]: editText });
    }
    setSaving(false);
  };

  const applyFindReplace = () => {
    if (!findStr) return;
    if (useRegex) {
      try { setEditText(editText.replace(new RegExp(findStr, 'g'), replaceStr)); }
      catch { setSaveMsg('Ongeldige regex'); }
    } else {
      setEditText(editText.split(findStr).join(replaceStr));
    }
  };

  const previewBulkFix = (pattern: typeof BULK_PATTERNS[0]) => {
    const cfg = TABLES[table];
    const changes: typeof previewChanges = [];
    for (const row of rows) {
      const original = row[cfg.textCol] || '';
      const fixed = original.replace(pattern.find, pattern.replace);
      if (fixed !== original) changes.push({ id: row.id, label: getDisplayLabel(row, table), before: original.slice(0, 120), after: fixed.slice(0, 120) });
    }
    setPreviewChanges(changes);
  };

  const applyBulkFix = async (pattern: typeof BULK_PATTERNS[0]) => {
    const cfg = TABLES[table];
    setSaving(true);
    let count = 0;
    for (const row of rows) {
      const original = row[cfg.textCol] || '';
      const fixed = original.replace(pattern.find, pattern.replace);
      if (fixed !== original) {
        const { error } = await supabase.from(table).update({ [cfg.textCol]: fixed }).eq('id', row.id);
        if (!error) count++;
      }
    }
    setSaveMsg(`${count} rij(en) bijgewerkt.`);
    setPreviewChanges([]);
    setSaving(false);
    doSearch();
  };

  return (
    <div className="adm-content">
      {/* Tabel selector */}
      <div className="adm-content-tabs">
        {(Object.keys(TABLES) as TableName[]).map(t => (
          <button key={t} className={`adm-tab${table === t ? ' active' : ''}`}
            onClick={() => { setTable(t); setRows([]); setEditRow(null); setPreviewChanges([]); setSaveMsg(''); }}>
            {TABLES[t].label}
          </button>
        ))}
      </div>

      {/* Zoekbalk */}
      <div className="adm-searchbar">
        <input
          type="text"
          placeholder={`Zoek in ${TABLES[table].label.toLowerCase()}…`}
          value={searchQ}
          onChange={e => setSearchQ(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && doSearch()}
          autoFocus
        />
        <button onClick={doSearch} disabled={loading}>{loading ? 'Laden…' : 'Zoek'}</button>
      </div>

      {/* Resultatenlijst */}
      {rows.length > 0 && !editRow && (
        <>
          <div className="adm-results-info">{rows.length} resultaten in {TABLES[table].label}</div>
          <div className="adm-results">
            {rows.map(row => {
              const text = row[TABLES[table].textCol] || '';
              return (
                <div key={row.id} className="adm-result" onClick={() => startEdit(row)}>
                  <span className="adm-result-label">{getDisplayLabel(row, table)}</span>
                  <span className="adm-result-preview">{text.slice(0, 200)}{text.length > 200 ? '…' : ''}</span>
                </div>
              );
            })}
          </div>

          {/* Bulk tools */}
          <div className="adm-bulk">
            <div className="adm-bulk-title">Bulk-correcties</div>
            {BULK_PATTERNS.map((p, i) => (
              <div key={i} className="adm-bulk-row">
                <div className="adm-bulk-info">
                  <strong>{p.label}</strong>
                  <span>{p.desc}</span>
                </div>
                <button onClick={() => previewBulkFix(p)}>Preview</button>
                <button onClick={() => applyBulkFix(p)} disabled={saving}>Toepassen</button>
              </div>
            ))}
            {previewChanges.length > 0 && (
              <div className="adm-bulk-preview">
                <strong>{previewChanges.length} wijzigingen:</strong>
                {previewChanges.slice(0, 10).map(c => (
                  <div key={c.id} className="adm-diff">
                    <div className="adm-diff-label">{c.label}</div>
                    <div className="adm-diff-old">{c.before}</div>
                    <div className="adm-diff-new">{c.after}</div>
                  </div>
                ))}
                {previewChanges.length > 10 && <div className="adm-diff-more">…en {previewChanges.length - 10} meer</div>}
              </div>
            )}
          </div>
        </>
      )}

      {/* Editor */}
      {editRow && (
        <div className="adm-editor">
          <div className="adm-editor-top">
            <button className="adm-back" onClick={() => { setEditRow(null); setSaveMsg(''); }}>← Terug naar resultaten</button>
            <span className="adm-editor-title">{getDisplayLabel(editRow, table)}</span>
          </div>

          <div className="adm-fr">
            <input placeholder="Zoek…" value={findStr} onChange={e => setFindStr(e.target.value)} />
            <input placeholder="Vervang met…" value={replaceStr} onChange={e => setReplaceStr(e.target.value)} />
            <label><input type="checkbox" checked={useRegex} onChange={e => setUseRegex(e.target.checked)} /> Regex</label>
            <button onClick={applyFindReplace}>Vervang</button>
          </div>

          <textarea className="adm-textarea" value={editText} onChange={e => setEditText(e.target.value)} rows={20} />

          <div className="adm-editor-footer">
            <button className="adm-save" onClick={saveEdit} disabled={saving}>{saving ? 'Opslaan…' : 'Opslaan'}</button>
            {saveMsg && <span className={saveMsg.startsWith('Fout') ? 'adm-msg-err' : 'adm-msg-ok'}>{saveMsg}</span>}
            <span className="adm-char-count">{editText.length} tekens</span>
          </div>
        </div>
      )}

      {rows.length === 0 && !loading && !editRow && (
        <div className="adm-empty">Zoek op tekst om records te vinden en te bewerken.</div>
      )}
    </div>
  );
}
