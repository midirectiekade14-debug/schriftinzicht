const fs = require('fs');
const path = require('path');
const dir = 'C:/Users/midir/schriftinzicht';
const skip = ['bible_books.json','bible_verses_map.json'];
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json') && !skip.includes(f));

const stats = [];
for (const f of files) {
  try {
    const raw = fs.readFileSync(path.join(dir, f), 'utf8');
    const data = JSON.parse(raw);
    const arr = Array.isArray(data) ? data :
      (data.data || data.verses || data.entries || data.commentaries || data.records ||
       (typeof data === 'object' ? Object.values(data).find(v => Array.isArray(v)) : null));

    if (!Array.isArray(arr) || arr.length === 0) {
      stats.push({f, count: 0, note: 'no array found', topKeys: Object.keys(data).slice(0,4).join(',')});
      continue;
    }

    const sample = arr[0];
    const textKey = sample && ['text','content','commentary','verklaring','body','tekst','description'].find(k => sample[k]);
    const texts = arr.map(e => (textKey ? e[textKey] : '') || '').filter(Boolean);

    if (texts.length === 0) {
      stats.push({f, count: arr.length, note: 'no text field found', keys: Object.keys(sample||{}).slice(0,6).join(',')});
      continue;
    }

    const avgLen = Math.round(texts.reduce((s,t) => s + t.length, 0) / texts.length);
    const maxLen = Math.max(...texts.map(t => t.length));
    const minLen = Math.min(...texts.map(t => t.length));
    const longTexts = texts.filter(t => t.length > 3000).length;
    const veryLong = texts.filter(t => t.length > 10000).length;
    const hasHtml = texts.filter(t => /<[a-z]+/i.test(t)).length;
    const hasFootnotes = texts.filter(t => /\[\d+\]|\(\d+\)|footnote/i.test(t)).length;
    const hasChapterHeaders = texts.filter(t => /hoofdstuk|chapter|BOOK|===|---\n/i.test(t)).length;
    const hasBracketJunk = texts.filter(t => /\[bron\]|\[edit\]|\[citation|\[noot|\[p\.\s*\d/i.test(t)).length;

    // Check verse/ref field
    const refKey = ['verse_ref','reference','ref','book_chapter_verse','verse','bijbelplaats'].find(k => sample[k]);
    const noRef = arr.filter(e => !e[refKey]).length;

    stats.push({f, count: arr.length, textKey, refKey, avgLen, minLen, maxLen, longTexts, veryLong, hasHtml, hasFootnotes, hasChapterHeaders, hasBracketJunk, noRef});
  } catch(e) {
    stats.push({f, error: e.message.slice(0,80)});
  }
}

// Sort by issues (most problematic first)
stats.sort((a,b) => ((b.veryLong||0) + (b.hasHtml||0) + (b.hasBracketJunk||0) + (b.hasChapterHeaders||0)) - ((a.veryLong||0) + (a.hasHtml||0) + (a.hasBracketJunk||0) + (a.hasChapterHeaders||0)));

console.log('\n=== DATAKWALITEIT RAPPORT ===\n');
console.log('Bestanden zonder problemen:');
const clean = stats.filter(s => !s.error && !s.note && s.veryLong === 0 && s.hasHtml === 0 && s.hasBracketJunk === 0 && s.hasChapterHeaders === 0 && s.noRef === 0);
clean.forEach(s => console.log(`  ✅ ${s.f} — ${s.count} records, avg ${s.avgLen} chars`));

console.log('\nBestanden MET problemen:');
const problem = stats.filter(s => s.error || s.note || s.veryLong > 0 || s.hasHtml > 0 || s.hasBracketJunk > 0 || s.hasChapterHeaders > 0 || s.noRef > 0);
problem.forEach(s => {
  if (s.error) { console.log(`  ❌ ${s.f} — PARSE ERROR: ${s.error}`); return; }
  if (s.note) { console.log(`  ⚠️  ${s.f} — ${s.note} (keys: ${s.topKeys || s.keys})`); return; }
  const issues = [];
  if (s.veryLong > 0) issues.push(`${s.veryLong}x VERY LONG (>10k)`);
  if (s.longTexts > 0) issues.push(`${s.longTexts}x lang (>3k)`);
  if (s.hasHtml > 0) issues.push(`${s.hasHtml}x HTML`);
  if (s.hasBracketJunk > 0) issues.push(`${s.hasBracketJunk}x bracket-junk`);
  if (s.hasChapterHeaders > 0) issues.push(`${s.hasChapterHeaders}x hoofdstuk-headers`);
  if (s.noRef > 0) issues.push(`${s.noRef}x geen verwijzing`);
  console.log(`  ⚠️  ${s.f} — ${s.count} records, avg ${s.avgLen} | ${issues.join(' | ')}`);
});

console.log('\n=== SAMENVATTING ===');
console.log(`Totaal bestanden: ${stats.length}`);
console.log(`Schoon: ${clean.length}, Met issues: ${problem.length}`);
const totalRecords = stats.filter(s => s.count).reduce((s,e) => s + e.count, 0);
console.log(`Totaal records: ${totalRecords}`);
