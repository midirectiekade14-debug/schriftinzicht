import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { parseReference } from '../../src/lib/parseReference.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

const setPath = resolve(__dirname, 'eval-set-v1.json');
const set = JSON.parse(await readFile(setPath, 'utf8'));

function eq(a, b) {
  if (a === null || b === null) return a === b;
  return (
    a.book === b.book &&
    a.chapter === b.chapter &&
    a.verseStart === b.verseStart &&
    a.verseEnd === b.verseEnd
  );
}

const byCat = {};
let pass = 0;
const fails = [];

for (const item of set.items) {
  const got = parseReference(item.input);
  const ok = eq(got, item.expected);
  byCat[item.category] ??= { pass: 0, total: 0 };
  byCat[item.category].total += 1;
  if (ok) {
    byCat[item.category].pass += 1;
    pass += 1;
  } else {
    fails.push({ id: item.id, input: item.input, expected: item.expected, got, note: item.note });
  }
}

const total = set.items.length;
const pct = ((pass / total) * 100).toFixed(1);

console.log(`\nparseReference baseline — eval-set v${set.version}`);
console.log(`Score: ${pass}/${total} (${pct}%)\n`);

console.log('By category:');
for (const [cat, s] of Object.entries(byCat)) {
  const p = ((s.pass / s.total) * 100).toFixed(0);
  console.log(`  ${cat.padEnd(10)} ${s.pass}/${s.total}  (${p}%)`);
}

if (fails.length) {
  console.log('\nFailures:');
  for (const f of fails) {
    console.log(`  [${f.id}] "${f.input}"`);
    console.log(`    expected: ${JSON.stringify(f.expected)}`);
    console.log(`    got:      ${JSON.stringify(f.got)}`);
    if (f.note) console.log(`    note:     ${f.note}`);
  }
}
