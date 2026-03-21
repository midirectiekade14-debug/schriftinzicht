const tests = [
  'romeinen 8 vers 10 tot 15',
  'genesis 1 vers 1',
  'psalm 23 vers 1 tot 6',
  'psalm 23 vers 1 tot en met 6',
  'johannes 3 vers 16',
  '1 korinthe 13 vers 4 tot 7',
  'Joh 3:16',
  'Rom 8:28-30',
  'Gen 1:1',
  'joh 3 16',
  'romeinen 8 10 tot 15',
  'jesaja 53 vers 1 tot 12',
  'openbaring 21 vers 1 tot 4',
  'psalm 119 v 105',
  'hand 2 vers 1 t/m 4',
];

function parse(input) {
  const n = input.trim().replace(/\s+/g, ' ');
  let m;
  m = n.match(/^(.+?)\s+(\d+)\s+(?:vers|vs\.?|v\.?)\s*(\d+)(?:\s*(?:tot(?:\s+en\s+met)?|[-\u2013]|t\/m)\s*(\d+))?$/i);
  if (m) return { b: m[1], c: m[2], s: m[3], e: m[4] || m[3], p: 1 };
  m = n.match(/^(.+?)\s+(\d+)\s+(\d+)\s+(?:tot(?:\s+en\s+met)?|t\/m)\s+(\d+)$/i);
  if (m) return { b: m[1], c: m[2], s: m[3], e: m[4], p: 2 };
  m = n.match(/^(.+?)\s+(\d+)\s*[:.,]\s*(\d+)(?:\s*[-\u2013]\s*(\d+))?$/i);
  if (m) return { b: m[1], c: m[2], s: m[3], e: m[4] || m[3], p: 3 };
  m = n.match(/^(.+?)\s+(\d+)\s+(\d+)$/i);
  if (m) return { b: m[1], c: m[2], s: m[3], e: m[3], p: 4 };
  return null;
}

let pass = 0;
let fail = 0;
for (const t of tests) {
  const r = parse(t);
  if (r) {
    const range = r.e !== r.s ? '-' + r.e : '';
    console.log('OK   ' + t.padEnd(38) + ' -> ' + r.b + ' ' + r.c + ':' + r.s + range + ' (P' + r.p + ')');
    pass++;
  } else {
    console.log('FAIL ' + t);
    fail++;
  }
}
console.log('\n' + pass + '/' + (pass + fail) + ' passed');
