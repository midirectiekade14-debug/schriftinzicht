const fs = require('fs');
const path = require('path');
const dir = 'C:/Users/midir/schriftinzicht';

function sample(filename, n = 2) {
  const raw = fs.readFileSync(path.join(dir, filename), 'utf8');
  const data = JSON.parse(raw);
  const arr = Array.isArray(data) ? data :
    (data.data || data.verses || data.entries || data.commentaries || data.records ||
     (typeof data === 'object' ? Object.values(data).find(v => Array.isArray(v)) : null));
  if (!Array.isArray(arr)) return { note: 'no array', keys: Object.keys(data).slice(0,5) };
  return arr.slice(0, n).map(e => ({
    keys: Object.keys(e),
    ref: e.verse_ref || e.reference || e.ref || e.book_chapter_verse || e.verse || e.bijbelplaats || e.title || e.naam || '(geen ref)',
    textLen: (e.text||e.content||e.commentary||e.verklaring||e.body||'').length,
    textPreview: (e.text||e.content||e.commentary||e.verklaring||e.body||'').slice(0, 500),
    textEnd: (e.text||e.content||e.commentary||e.verklaring||e.body||'').slice(-200),
  }));
}

// Most problematic files
const targets = [
  'spurgeon_nl.json',
  'sermons_calvijn.json',
  'sermons_vandergroe.json',
  'sermons_kohlbrugge.json',
  'calvijn.json',
  'dachsel_extra.json',
  'calvijn_preken.json',
];

for (const f of targets) {
  console.log('\n' + '='.repeat(60));
  console.log('FILE:', f);
  console.log('='.repeat(60));
  try {
    const s = sample(f, 1);
    if (s.note) { console.log('NOTE:', s.note, s.keys); continue; }
    for (const r of s) {
      console.log('Keys:', r.keys.join(', '));
      console.log('Ref:', r.ref);
      console.log('TextLen:', r.textLen);
      console.log('--- BEGIN ---');
      console.log(r.textPreview);
      console.log('--- END ---');
      console.log(r.textEnd);
    }
  } catch(e) { console.log('ERROR:', e.message); }
}
