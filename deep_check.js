const fs = require('fs');
const path = require('path');
const dir = 'C:/Users/midir/schriftinzicht';

function load(filename) {
  const raw = fs.readFileSync(path.join(dir, filename), 'utf8');
  const data = JSON.parse(raw);
  return Array.isArray(data) ? data :
    (data.data || data.verses || data.entries || data.commentaries || data.records ||
     (typeof data === 'object' ? Object.values(data).find(v => Array.isArray(v)) : null));
}

// 1. calvijn.json - check junk entries
console.log('\n=== calvijn.json: junk entries sample ===');
const calvijn = load('calvijn.json');
const junk = calvijn.filter(e => (e.text||'').length < 50);
console.log('Total junk (<50 chars):', junk.length, 'of', calvijn.length);
console.log('Sample junk:', junk.slice(0,5).map(e => JSON.stringify({ref: e.verse_ref||e.verse, text: e.text})));

// 2. spurgeon_nl.json - check structure
console.log('\n=== spurgeon_nl.json: record structure ===');
const spnl = load('spurgeon_nl.json');
console.log('Total records:', spnl.length);
console.log('Avg text per record:', Math.round(spnl.reduce((s,e)=>s+(e.text||'').length,0)/spnl.length));
// Each record seems to be a sermon. Check if text contains multiple sermons
const multiSermons = spnl.filter(e => {
  const matches = (e.text||'').match(/^\d+\.\s+[A-Z]/gm);
  return matches && matches.length > 1;
});
console.log('Records with multiple sermon headers:', multiSermons.length);
// Show first record structure
const s0 = spnl[0];
console.log('Keys:', Object.keys(s0));
console.log('Book/chap/verse:', s0.book, s0.chapter, s0.verse, '-', s0.verse_end);
console.log('Text headers:', (s0.text||'').match(/^\d+\.\s+.{0,60}/gm)?.slice(0,5));

// 3. sermons_calvijn.json - check if one record = entire book
console.log('\n=== sermons_calvijn.json: record distribution ===');
const serCalvijn = load('sermons_calvijn.json');
console.log('Total records:', serCalvijn.length);
serCalvijn.slice(0,5).forEach(r => {
  console.log(`  title: "${(r.title||'').slice(0,60)}" | book:${r.book} | ch:${r.chapter} | vs:${r.verse}-${r.verse_end} | len:${(r.text||'').length}`);
});

// 4. Check if sermons have TOC at start
console.log('\n=== sermons_vandergroe.json: all records ===');
const vdg = load('sermons_vandergroe.json');
console.log('Total:', vdg.length);
vdg.slice(0,10).forEach(r => {
  console.log(`  vs:${r.verse} | len:${(r.text||'').length} | preview: "${(r.text||'').slice(0,100).replace(/\n/g,' ')}"`);
});

// 5. Check HTML content
console.log('\n=== sermons_comrie.json: HTML sample ===');
const comrie = load('sermons_comrie.json');
const htmlItems = comrie.filter(e => /<[a-z]+/i.test(e.text||''));
console.log('Items with HTML:', htmlItems.length);
if (htmlItems[0]) console.log('Sample:', (htmlItems[0].text||'').slice(0,300));

// 6. Check dachsel_studylight.json - massive file
console.log('\n=== dachsel_studylight.json: stats ===');
const dachsel = load('dachsel_studylight.json');
console.log('Total:', dachsel.length);
const longDach = dachsel.filter(e => (e.text||'').length > 3000);
console.log('Long (>3k):', longDach.length);
// Check verse reference coverage
const hasRef = dachsel.filter(e => e.book && e.chapter && e.verse).length;
console.log('Has book/chapter/verse:', hasRef, 'of', dachsel.length);
// Sample
const d0 = dachsel[0];
console.log('Keys:', Object.keys(d0));
console.log('Sample ref:', d0.book, d0.chapter, d0.verse, '| len:', (d0.text||'').length);
console.log('Preview:', (d0.text||'').slice(0,300));

// 7. Summary of what data is in Supabase
console.log('\n=== ACTIEPUNTEN SAMENVATTING ===');
console.log('1. calvijn.json: junk-rijen opschonen (boek-naam entries)');
console.log('2. spurgeon_nl.json: elk record = 1 preek → ok als sermon-level, maar heeft GEEN verse-ref');
console.log('3. sermons_*.json: records zijn hele boeken (>10k) → per preek opsplitsen OF accepteren als sermon-level');
console.log('4. HTML-tags verwijderen uit comrie, apostolisch, calvijn_preken');
console.log('5. dachsel_studylight.json: 51k records met verse-refs → check op "hoofdstuk-headers" die er in zitten');
