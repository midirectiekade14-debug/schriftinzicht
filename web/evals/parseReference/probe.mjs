import { parseReference } from '../../src/lib/parseReference.ts';

const probes = [
  'Joh 3:16a',
  'Rom 8:28-9:5',
  'Rom 8:28; 12:1',
  'Joh 3:16,17,18',
  'Pred. 3:1-8',
  'Ps. 119:105',
  'Rom 8 vers 28',
  'Romeinen 8:28-9:5',
  'genesis hoofdstuk 1 vers 1',
  'openbaring 22:17,21',
  'Joh 3-4',
  '1 Joh. 4:8',
  'Hand 2: 1-13',
  'PSALM 23:1',
  'rom8:28',
  'Mat. 5:3',
  'Joh.3:16',
  '1Joh4:8',
  'genesis 1, vers 1',
  'romeinen acht vers tien',
];

for (const p of probes) {
  const r = parseReference(p);
  console.log(`${p.padEnd(35)} → ${r ? JSON.stringify(r) : 'null'}`);
}
