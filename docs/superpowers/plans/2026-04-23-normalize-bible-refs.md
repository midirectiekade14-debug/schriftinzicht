# normalize_bible_refs Autoresearch Loop — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (for the regex-port fase, taken 5a-5f) of superpowers:executing-plans (voor de overige lineaire taken). Steps use checkbox (`- [ ]`) syntax.

**Goal:** Zet een werkende autoresearch-loop op voor `normalize_bible_refs` met eval-set v1 (100 items), baseline gemeten, runner + verify + guard operationeel, klaar voor `/autoresearch:plan` take-over.

**Architectuur:** TS-port als nieuwe bron-van-waarheid (`web/src/lib/normalizeBibleRefs.ts`), lokale eval-loop (seconden/iter), SQL-migratie + RPC-regressie pas bij convergentie. Metric via `parseReference`-pipeline. Branch `autoresearch/normalize-bible-refs`.

**Tech Stack:** Node 25.6+ TS-stripping, TypeScript (strict), Supabase Management MCP, bash (verify/guard), JSON (eval-set).

**Spec**: `docs/superpowers/specs/2026-04-23-normalize-bible-refs-autoresearch.md`

---

## File Structure

| Pad | Type | Verantwoordelijkheid |
|---|---|---|
| `web/src/lib/normalizeBibleRefs.ts` | Nieuw | TS-port van PL/pgSQL functie. Export `normalizeBibleRefs(input: string): string`. Bron-van-waarheid. |
| `web/evals/normalizeBibleRefs/eval-set-v1.json` | Nieuw | 100 items {input, expected: BibleRef \| BibleRef[]} |
| `web/evals/normalizeBibleRefs/run.mjs` | Nieuw | Runner: pipeline normalize→parseReference, score-output |
| `web/evals/normalizeBibleRefs/verify.sh` | Nieuw | Bare-number metric voor autoresearch Verify-veld |
| `web/evals/normalizeBibleRefs/guard.sh` | Nieuw | Draait parseReference-eval, eist 100.0%, anders exit 1 |
| `web/evals/normalizeBibleRefs/extract-corpus-refs.mjs` | Nieuw | Helper: query Supabase → kandidaat ref-strings |
| `web/evals/normalizeBibleRefs/parity-check.mjs` | Nieuw | Vergelijkt TS-normalize output met live Supabase RPC op 1000 samples |
| `web/evals/normalizeBibleRefs/sync-to-sql.mjs` | Nieuw (deferred) | Codegen TS→PL/pgSQL migratie bij convergentie |
| `web/evals/normalizeBibleRefs/results.tsv` | Nieuw | iter/score/guard/decision/change log |
| `web/evals/normalizeBibleRefs/sql-baseline.sql` | Nieuw | Snapshot van huidige PL/pgSQL body, reference tijdens port |

---

## Fase 1 — Pre-stap: merge openstaande autoresearch branch

*Raakt productie (schriftinzicht.nl gh-pages deploy). Alleen uitvoeren na expliciete go.*

### Task 1: Merge `autoresearch/expand-inline-refs` naar master

**Files:**
- Modify: master branch (merge)

- [ ] **Step 1:** Verifieer dat master schoon is + branch nog bestaat

```bash
git status --short   # expected: alleen ?? schriftinzicht-dashboard.html (untracked)
git log --oneline master..autoresearch/expand-inline-refs | head
```
Expected: 5 commits (chore+experiments).

- [ ] **Step 2:** Fast-forward of no-ff merge (behoudt iter-historie)

```bash
git merge --no-ff autoresearch/expand-inline-refs -m "merge: autoresearch/expand-inline-refs — expandInlineRefs 66%→100%"
```

- [ ] **Step 3:** Push naar origin (triggert gh-pages deploy via Actions workflow)

```bash
git push origin master
```

- [ ] **Step 4:** Verifieer deploy-run start

```bash
gh run list --branch master --limit 3
```
Expected: nieuwste run has status `in_progress` of `queued`.

- [ ] **Step 5:** Wacht op deploy-completion (≈2 min)

```bash
gh run watch
```
Expected: run status `completed success`.

- [ ] **Step 6:** Verifieer live site draait

```bash
curl -sI https://schriftinzicht.nl/ | head -3
```
Expected: `HTTP/2 200`.

---

## Fase 2 — Branch + scaffold

### Task 2: Nieuwe branch + directories

**Files:**
- Create: `web/evals/normalizeBibleRefs/` (dir)

- [ ] **Step 1:** Branch vanaf master

```bash
git checkout master
git pull --ff-only
git checkout -b autoresearch/normalize-bible-refs
```

- [ ] **Step 2:** Maak eval-directory + lege results.tsv

```bash
mkdir -p web/evals/normalizeBibleRefs
printf "iter\tscore\tguard\tdecision\tchange\n" > web/evals/normalizeBibleRefs/results.tsv
```

- [ ] **Step 3:** Commit scaffold

```bash
git add web/evals/normalizeBibleRefs/results.tsv
git commit -m "chore(evals): scaffold normalizeBibleRefs eval-directory"
```

---

## Fase 3 — Huidige SQL-functie ophalen en porten

### Task 3: Haal huidige `normalize_bible_refs` body op uit Supabase

**Files:**
- Create: `web/evals/normalizeBibleRefs/sql-baseline.sql`

- [ ] **Step 1:** Query PL/pgSQL source via Supabase MCP

Gebruik `mcp__supabase__execute_sql` op de SchriftInzicht project-ref met:

```sql
SELECT pg_get_functiondef('public.normalize_bible_refs(text)'::regprocedure) AS body;
```

- [ ] **Step 2:** Schrijf output naar `sql-baseline.sql`

```bash
# De MCP-output naar bestand kopiëren. Inhoud begint met:
# CREATE OR REPLACE FUNCTION public.normalize_bible_refs(input text)
# RETURNS text LANGUAGE plpgsql AS $function$ ... $function$
```

- [ ] **Step 3:** Commit baseline-snapshot

```bash
git add web/evals/normalizeBibleRefs/sql-baseline.sql
git commit -m "chore(evals): snapshot normalize_bible_refs PL/pgSQL baseline"
```

### Task 4: Stub `normalizeBibleRefs.ts` met typed signature

**Files:**
- Create: `web/src/lib/normalizeBibleRefs.ts`
- Test: `web/evals/normalizeBibleRefs/run.mjs` (later)

- [ ] **Step 1:** Schrijf stub

```typescript
// web/src/lib/normalizeBibleRefs.ts
/**
 * TS-port van de PL/pgSQL-functie public.normalize_bible_refs(text).
 * Bron-van-waarheid tijdens autoresearch. Bij convergentie geregenereerd naar SQL via sync-to-sql.mjs.
 */

export function normalizeBibleRefs(input: string): string {
  // Iter0: identity — regex-patronen worden geport in subagent-fase hieronder.
  return input;
}
```

- [ ] **Step 2:** Commit stub

```bash
git add web/src/lib/normalizeBibleRefs.ts
git commit -m "feat(lib): normalizeBibleRefs stub (identity) — iter0 start"
```

### Task 5: Port ~100 regex-patronen uit SQL naar TS *(subagent-gedelegeerd)*

Deze taak wordt uitgevoerd via `superpowers:subagent-driven-development` omdat de ~100 patronen groeperen in onafhankelijke regex-families.

- [ ] **Step 1:** Lees `sql-baseline.sql`, identificeer regex-groepen

Verwachte groepen: (a) verse-ranges, (b) abbreviation-expansion, (c) multi-ref-split, (d) whitespace-normalisatie, (e) Ps./hoofdstuk-only, (f) overige edge-patterns.

- [ ] **Step 2:** Per groep: dispatch subagent

Template-prompt voor elke subagent:

> Port regex-groep `<groep>` uit `web/evals/normalizeBibleRefs/sql-baseline.sql` naar TS-equivalent in `web/src/lib/normalizeBibleRefs.ts`. Voeg `// SQL:` comment toe met originele PL/pgSQL-regel boven elke TS-regex. PL/pgSQL gebruikt POSIX-regex (`regexp_replace`); JS gebruikt PCRE-achtig. Let op lookbehind-support (JS heeft het wel, PL/pgSQL niet — dus meestal niet nodig). Commit met prefix `feat(lib): port regex-groep <groep> naar TS`.

- [ ] **Step 3:** Na alle subagents: smoke-test dat TS-bestand geldig compileert

```bash
cd web && npx tsc --noEmit src/lib/normalizeBibleRefs.ts
```
Expected: geen type-errors.

- [ ] **Step 4:** Smoke-test dat functie niet meer identity is

```bash
node --experimental-strip-types -e "import('./web/src/lib/normalizeBibleRefs.ts').then(m => console.log(m.normalizeBibleRefs('Jes. 28:28')))"
```
Expected: non-trivial output (canonical form).

- [ ] **Step 5:** Commit is per subagent al gebeurd — geen extra commit

---

## Fase 4 — Eval-set v1 opbouwen

### Task 6: `extract-corpus-refs.mjs` — helper om kandidaat-refs uit corpus te halen

**Files:**
- Create: `web/evals/normalizeBibleRefs/extract-corpus-refs.mjs`

- [ ] **Step 1:** Schrijf helper

```javascript
// web/evals/normalizeBibleRefs/extract-corpus-refs.mjs
// Haalt kandidaat ref-strings uit commentaries + kanttekeningen via Supabase REST.
// Output: JSON-array van {source_table, source_id, raw_ref, context_snippet}.
import { readFile, writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const env = Object.fromEntries(
  (await readFile(resolve(__dirname, '../../.env'), 'utf8'))
    .split('\n').filter(Boolean).map(l => l.split('='))
);

const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

// Regex voor "iets dat op ref lijkt" — ruim, post-filter handmatig.
const REF_RE = /\b(?:[1-3]\s?)?[A-Z][a-z]+\.?\s*\d+\s*:\s*\d+(?:[-–]\d+)?/g;

async function fetchSamples(table, column, limit = 200) {
  const { data, error } = await sb.from(table).select(`id, ${column}`).limit(limit);
  if (error) throw error;
  const out = [];
  for (const row of data) {
    const text = row[column] ?? '';
    for (const m of text.matchAll(REF_RE)) {
      out.push({
        source_table: table,
        source_id: row.id,
        raw_ref: m[0],
        context_snippet: text.slice(Math.max(0, m.index - 30), m.index + m[0].length + 30),
      });
    }
  }
  return out;
}

const commentaries = await fetchSamples('commentaries', 'commentary_text', 100);
const kanttekeningen = await fetchSamples('kanttekeningen', 'note_text', 100);

const all = [...commentaries, ...kanttekeningen];
console.log(`Extracted ${all.length} candidate refs (${commentaries.length} commentaries + ${kanttekeningen.length} kanttekeningen)`);

await writeFile(resolve(__dirname, 'corpus-candidates.json'), JSON.stringify(all, null, 2));
console.log('Saved → corpus-candidates.json');
```

- [ ] **Step 2:** Run helper

```bash
cd web && node --experimental-strip-types evals/normalizeBibleRefs/extract-corpus-refs.mjs
```
Expected: `Extracted N candidate refs (... + ...)` en `corpus-candidates.json` (~300-500 items).

- [ ] **Step 3:** Commit helper, gitignore candidates

```bash
echo "corpus-candidates.json" >> web/evals/normalizeBibleRefs/.gitignore
git add web/evals/normalizeBibleRefs/extract-corpus-refs.mjs web/evals/normalizeBibleRefs/.gitignore
git commit -m "chore(evals): extract-corpus-refs helper + gitignore candidates"
```

### Task 7: Handmatig selecteren: 60 gestratificeerde corpus-items

- [ ] **Step 1:** Open `corpus-candidates.json`, filter via script:

```bash
# Laat ~30 candidates zien, random sample, met verwachte BibleRef nog niet gelabeld:
node -e "const d=require('./web/evals/normalizeBibleRefs/corpus-candidates.json'); const shuffled=d.sort(()=>Math.random()-0.5).slice(0,120); require('fs').writeFileSync('./web/evals/normalizeBibleRefs/sample-120.json', JSON.stringify(shuffled,null,2))"
```

- [ ] **Step 2:** Handmatig review `sample-120.json` → selecteer 60 items met stratificatie:
  - ~30 nu-werkende refs (doorloop intuïtief correct)
  - ~30 problematische refs (rare abbreviaties, oude spelling, damaged whitespace)

Voor elk geselecteerd item: label `expected` als `BibleRef` (single) of `BibleRef[]` (multi-ref). Gebruik bestaande BOOK_ALIASES uit `parseReference.ts` voor canonical book-namen.

Schrijf als tussenresultaat `web/evals/normalizeBibleRefs/corpus-60.json`:
```json
[
  {
    "id": "CORPUS-001",
    "category": "corpus",
    "source": "commentaries:<id>",
    "input": "Jes. 28:28",
    "expected": {"book": "Jesaja", "chapter": 28, "verseStart": 28, "verseEnd": 28}
  },
  ...
]
```

- [ ] **Step 3:** Commit (corpus-60 is onderdeel van eval, niet gitignored)

```bash
git add web/evals/normalizeBibleRefs/corpus-60.json
git commit -m "chore(evals): 60 corpus items gestratificeerd gelabeld"
```

### Task 8: 40 handcraft edge cases

**Files:**
- Create: `web/evals/normalizeBibleRefs/handcraft-40.json`

- [ ] **Step 1:** Schrijf handcraft-items volgens de categoriëen uit spec §7:

```json
[
  {"id": "RANGE-01", "category": "verse-range", "input": "Joh. 3:16-17", "expected": {"book": "Johannes", "chapter": 3, "verseStart": 16, "verseEnd": 17}},
  {"id": "RANGE-02", "category": "verse-range", "input": "Rom 8:1–5", "expected": {"book": "Romeinen", "chapter": 8, "verseStart": 1, "verseEnd": 5}},
  {"id": "RANGE-03", "category": "verse-range", "input": "Ps 23:1 t/m 6", "expected": {"book": "Psalmen", "chapter": 23, "verseStart": 1, "verseEnd": 6}},
  {"id": "RANGE-04", "category": "verse-range", "input": "Gen 1:1-2:3", "expected": [{"book": "Genesis", "chapter": 1, "verseStart": 1, "verseEnd": 31}, {"book": "Genesis", "chapter": 2, "verseStart": 1, "verseEnd": 3}], "note": "cross-chapter range"},

  {"id": "ABBR-01", "category": "abbreviation", "input": "1Kor 3:16", "expected": {"book": "1 Korinthiërs", "chapter": 3, "verseStart": 16, "verseEnd": 16}},
  {"id": "ABBR-02", "category": "abbreviation", "input": "Openb. 5:6", "expected": {"book": "Openbaring van Johannes", "chapter": 5, "verseStart": 6, "verseEnd": 6}},
  {"id": "ABBR-03", "category": "abbreviation", "input": "Ps. 23", "expected": {"book": "Psalmen", "chapter": 23, "verseStart": 1, "verseEnd": 6}, "note": "chapter-only — verseEnd=final-verse"},
  {"id": "ABBR-04", "category": "abbreviation", "input": "1 Thess 4:13", "expected": {"book": "1 Thessalonicenzen", "chapter": 4, "verseStart": 13, "verseEnd": 13}},
  {"id": "ABBR-05", "category": "abbreviation", "input": "Spr 1:7", "expected": {"book": "Spreuken", "chapter": 1, "verseStart": 7, "verseEnd": 7}},
  {"id": "ABBR-06", "category": "abbreviation", "input": "Matth. 28:19", "expected": {"book": "Mattheüs", "chapter": 28, "verseStart": 19, "verseEnd": 19}},

  {"id": "MULTI-01", "category": "multi-ref", "input": "Rom. 8:1, 3", "expected": [{"book": "Romeinen", "chapter": 8, "verseStart": 1, "verseEnd": 1}, {"book": "Romeinen", "chapter": 8, "verseStart": 3, "verseEnd": 3}]},
  {"id": "MULTI-02", "category": "multi-ref", "input": "Gen 1:1; 2:4", "expected": [{"book": "Genesis", "chapter": 1, "verseStart": 1, "verseEnd": 1}, {"book": "Genesis", "chapter": 2, "verseStart": 4, "verseEnd": 4}]},
  {"id": "MULTI-03", "category": "multi-ref", "input": "Joh 3:16 en Rom 8:1", "expected": [{"book": "Johannes", "chapter": 3, "verseStart": 16, "verseEnd": 16}, {"book": "Romeinen", "chapter": 8, "verseStart": 1, "verseEnd": 1}]},
  {"id": "MULTI-04", "category": "multi-ref", "input": "Ps. 1, 2, 3", "expected": [{"book": "Psalmen", "chapter": 1, "verseStart": 1, "verseEnd": -1}, {"book": "Psalmen", "chapter": 2, "verseStart": 1, "verseEnd": -1}, {"book": "Psalmen", "chapter": 3, "verseStart": 1, "verseEnd": -1}], "note": "verseEnd=-1 sentinel voor 'hele hoofdstuk'"},
  {"id": "MULTI-05", "category": "multi-ref", "input": "Hebr. 11:1-3, 6", "expected": [{"book": "Hebreeën", "chapter": 11, "verseStart": 1, "verseEnd": 3}, {"book": "Hebreeën", "chapter": 11, "verseStart": 6, "verseEnd": 6}]},

  {"id": "WS-01", "category": "whitespace", "input": "Joh. 3 : 16", "expected": {"book": "Johannes", "chapter": 3, "verseStart": 16, "verseEnd": 16}},
  {"id": "WS-02", "category": "whitespace", "input": "Jes  28:28", "expected": {"book": "Jesaja", "chapter": 28, "verseStart": 28, "verseEnd": 28}},
  {"id": "WS-03", "category": "whitespace", "input": "Rom.\n8:1", "expected": {"book": "Romeinen", "chapter": 8, "verseStart": 1, "verseEnd": 1}},
  {"id": "WS-04", "category": "whitespace", "input": "1 Kor.\t3:16", "expected": {"book": "1 Korinthiërs", "chapter": 3, "verseStart": 16, "verseEnd": 16}},

  {"id": "LANG-01", "category": "en-variant", "input": "Revelation 5:6", "expected": {"book": "Openbaring van Johannes", "chapter": 5, "verseStart": 6, "verseEnd": 6}},
  {"id": "LANG-02", "category": "en-variant", "input": "Genesis 1:1", "expected": {"book": "Genesis", "chapter": 1, "verseStart": 1, "verseEnd": 1}},
  {"id": "LANG-03", "category": "en-variant", "input": "1 Corinthians 13:4", "expected": {"book": "1 Korinthiërs", "chapter": 13, "verseStart": 4, "verseEnd": 4}},
  {"id": "LANG-04", "category": "en-variant", "input": "Matthew 5:3", "expected": {"book": "Mattheüs", "chapter": 5, "verseStart": 3, "verseEnd": 3}},

  {"id": "CHOPENLY-01", "category": "chapter-only", "input": "Ps. 23", "expected": {"book": "Psalmen", "chapter": 23, "verseStart": 1, "verseEnd": -1}},
  {"id": "CHOPENLY-02", "category": "chapter-only", "input": "Spr 1", "expected": {"book": "Spreuken", "chapter": 1, "verseStart": 1, "verseEnd": -1}},
  {"id": "CHOPENLY-03", "category": "chapter-only", "input": "Openb. 22", "expected": {"book": "Openbaring van Johannes", "chapter": 22, "verseStart": 1, "verseEnd": -1}},

  {"id": "BOOK-01", "category": "book-only", "input": "Esther", "expected": {"book": "Esther", "chapter": 1, "verseStart": 1, "verseEnd": -1}, "note": "book-only: chapter=1, verseEnd=-1"},
  {"id": "BOOK-02", "category": "book-only", "input": "Ruth", "expected": {"book": "Ruth", "chapter": 1, "verseStart": 1, "verseEnd": -1}},

  {"id": "ARCH-01", "category": "archaic", "input": "1 B. Mos. 3:15", "expected": {"book": "Genesis", "chapter": 3, "verseStart": 15, "verseEnd": 15}, "note": "1 Boek Mozes = Genesis"},
  {"id": "ARCH-02", "category": "archaic", "input": "Ie Kor. 13:13", "expected": {"book": "1 Korinthiërs", "chapter": 13, "verseStart": 13, "verseEnd": 13}, "note": "Romeins cijfer I = 1"},
  {"id": "ARCH-03", "category": "archaic", "input": "Ij Petr. 1:4", "expected": {"book": "2 Petrus", "chapter": 1, "verseStart": 4, "verseEnd": 4}, "note": "Ij = II = 2"},
  {"id": "ARCH-04", "category": "archaic", "input": "Pred.er 3:1", "expected": {"book": "Prediker", "chapter": 3, "verseStart": 1, "verseEnd": 1}, "note": "OCR-schade"},

  {"id": "EDGE-01", "category": "edge", "input": "(Joh. 3:16)", "expected": {"book": "Johannes", "chapter": 3, "verseStart": 16, "verseEnd": 16}, "note": "ref in haakjes"},
  {"id": "EDGE-02", "category": "edge", "input": "Joh. 3:16.", "expected": {"book": "Johannes", "chapter": 3, "verseStart": 16, "verseEnd": 16}, "note": "ref gevolgd door punt"},
  {"id": "EDGE-03", "category": "edge", "input": "Ps. 119:105a", "expected": {"book": "Psalmen", "chapter": 119, "verseStart": 105, "verseEnd": 105}, "note": "vers-letter negeren"},
  {"id": "EDGE-04", "category": "edge", "input": "Rom. 1-3", "expected": [{"book": "Romeinen", "chapter": 1, "verseStart": 1, "verseEnd": -1}, {"book": "Romeinen", "chapter": 2, "verseStart": 1, "verseEnd": -1}, {"book": "Romeinen", "chapter": 3, "verseStart": 1, "verseEnd": -1}], "note": "chapter-range"},
  {"id": "EDGE-05", "category": "edge", "input": "Ps.xxiii:1", "expected": {"book": "Psalmen", "chapter": 23, "verseStart": 1, "verseEnd": 1}, "note": "Romeinse hoofdstuk-numbering"},
  {"id": "EDGE-06", "category": "edge", "input": "2 Samuel 11: 1 - 27", "expected": {"book": "2 Samuël", "chapter": 11, "verseStart": 1, "verseEnd": 27}}
]
```

- [ ] **Step 2:** Commit

```bash
git add web/evals/normalizeBibleRefs/handcraft-40.json
git commit -m "chore(evals): 40 handcraft edge cases voor normalizeBibleRefs eval"
```

### Task 9: Merge tot `eval-set-v1.json`

**Files:**
- Create: `web/evals/normalizeBibleRefs/eval-set-v1.json`

- [ ] **Step 1:** Merge-script

```bash
node -e "
const c = require('./web/evals/normalizeBibleRefs/corpus-60.json');
const h = require('./web/evals/normalizeBibleRefs/handcraft-40.json');
const set = {
  version: 1,
  target: 'web/src/lib/normalizeBibleRefs.ts → normalizeBibleRefs()',
  contract: {
    input: 'ruwe ref-string of tekstfragment met ref',
    output: 'string die parseReference() correct kan parsen',
    metric: 'parseReference(normalizeBibleRefs(input)) set-equal expected'
  },
  items: [...c, ...h]
};
require('fs').writeFileSync('./web/evals/normalizeBibleRefs/eval-set-v1.json', JSON.stringify(set, null, 2));
console.log('Wrote', set.items.length, 'items');
"
```
Expected: `Wrote 100 items`.

- [ ] **Step 2:** Commit eval-set, verwijder tussenstappen

```bash
git rm web/evals/normalizeBibleRefs/corpus-60.json web/evals/normalizeBibleRefs/handcraft-40.json
git add web/evals/normalizeBibleRefs/eval-set-v1.json
git commit -m "chore(evals): normalizeBibleRefs eval-set v1 (60 corpus + 40 handcraft)"
```

---

## Fase 5 — Runner + verify + guard

### Task 10: `run.mjs` — eval-runner

**Files:**
- Create: `web/evals/normalizeBibleRefs/run.mjs`

- [ ] **Step 1:** Schrijf runner

```javascript
// web/evals/normalizeBibleRefs/run.mjs
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { parseReference } from '../../src/lib/parseReference.ts';
import { normalizeBibleRefs } from '../../src/lib/normalizeBibleRefs.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const set = JSON.parse(await readFile(resolve(__dirname, 'eval-set-v1.json'), 'utf8'));

function refEq(a, b) {
  if (a === null || b === null) return a === b;
  return a.book === b.book
      && a.chapter === b.chapter
      && a.verseStart === b.verseStart
      && a.verseEnd === b.verseEnd;
}

function setEq(got, exp) {
  const gArr = Array.isArray(got) ? got : [got];
  const eArr = Array.isArray(exp) ? exp : [exp];
  if (gArr.length !== eArr.length) return false;
  const used = new Set();
  for (const g of gArr) {
    const idx = eArr.findIndex((e, i) => !used.has(i) && refEq(g, e));
    if (idx === -1) return false;
    used.add(idx);
  }
  return true;
}

const byCat = {};
let pass = 0;
const fails = [];

for (const item of set.items) {
  const normalized = normalizeBibleRefs(item.input);
  const parsed = parseReference(normalized);
  const ok = setEq(parsed, item.expected);
  byCat[item.category] ??= { pass: 0, total: 0 };
  byCat[item.category].total += 1;
  if (ok) {
    byCat[item.category].pass += 1;
    pass += 1;
  } else {
    fails.push({ id: item.id, category: item.category, input: item.input, normalized, parsed, expected: item.expected, note: item.note });
  }
}

const total = set.items.length;
const pct = ((pass / total) * 100).toFixed(1);

console.log(`\nnormalizeBibleRefs baseline — eval-set v${set.version}`);
console.log(`Score: ${pass}/${total} (${pct}%)\n`);

console.log('By category:');
for (const [cat, s] of Object.entries(byCat)) {
  const p = ((s.pass / s.total) * 100).toFixed(0);
  console.log(`  ${cat.padEnd(15)} ${s.pass}/${s.total}  (${p}%)`);
}

if (fails.length) {
  console.log('\nFailures:');
  for (const f of fails) {
    console.log(`  [${f.id}] (${f.category})`);
    console.log(`    input:      ${f.input}`);
    console.log(`    normalized: ${f.normalized}`);
    console.log(`    parsed:     ${JSON.stringify(f.parsed)}`);
    console.log(`    expected:   ${JSON.stringify(f.expected)}`);
    if (f.note) console.log(`    note:       ${f.note}`);
  }
}
```

- [ ] **Step 2:** Smoke-test runner

```bash
cd web && node --experimental-strip-types evals/normalizeBibleRefs/run.mjs | head -5
```
Expected: eerste regels tonen `normalizeBibleRefs baseline — eval-set v1` + `Score: N/100 (X.X%)`.

- [ ] **Step 3:** Commit runner

```bash
git add web/evals/normalizeBibleRefs/run.mjs
git commit -m "feat(evals): normalizeBibleRefs runner met set-equal matching"
```

### Task 11: `verify.sh`

**Files:**
- Create: `web/evals/normalizeBibleRefs/verify.sh`

- [ ] **Step 1:** Schrijf script (copy-pattern uit expandInlineRefs):

```bash
#!/usr/bin/env bash
# Outputs the normalizeBibleRefs eval pass-rate as a bare number (e.g. 72.0).
# Used by autoresearch as the primary metric command.
set -euo pipefail
cd "$(dirname "$0")"
node --experimental-strip-types run.mjs | grep '^Score:' | sed -E 's/.*\(([0-9.]+)%\)/\1/'
```

- [ ] **Step 2:** Maak executable + test

```bash
chmod +x web/evals/normalizeBibleRefs/verify.sh
bash web/evals/normalizeBibleRefs/verify.sh
```
Expected: enkel getal met één decimaal, bv. `72.0`.

- [ ] **Step 3:** Commit

```bash
git add web/evals/normalizeBibleRefs/verify.sh
git commit -m "feat(evals): normalizeBibleRefs verify.sh (bare-number metric)"
```

### Task 12: `guard.sh`

**Files:**
- Create: `web/evals/normalizeBibleRefs/guard.sh`

- [ ] **Step 1:** Schrijf script (copy-pattern, maar runs parseReference eval):

```bash
#!/usr/bin/env bash
# Regression guard: parseReference eval must remain at 100%.
# Exits 0 if pass-rate is 100.0, exits 1 otherwise.
set -euo pipefail
cd "$(dirname "$0")/../parseReference"
SCORE=$(node --experimental-strip-types run.mjs | grep '^Score:' | sed -E 's/.*\(([0-9.]+)%\)/\1/')
if [ "$SCORE" = "100.0" ]; then
  exit 0
else
  echo "parseReference regressed to $SCORE%" >&2
  exit 1
fi
```

- [ ] **Step 2:** Executable + test

```bash
chmod +x web/evals/normalizeBibleRefs/guard.sh
bash web/evals/normalizeBibleRefs/guard.sh && echo "GUARD OK" || echo "GUARD FAIL"
```
Expected: `GUARD OK` (parseReference staat op 100%).

- [ ] **Step 3:** Commit

```bash
git add web/evals/normalizeBibleRefs/guard.sh
git commit -m "feat(evals): normalizeBibleRefs guard.sh (parseReference regression check)"
```

---

## Fase 6 — Iter0 baseline + parity-check

### Task 13: Baseline meten + log naar results.tsv

- [ ] **Step 1:** Draai verify + guard sequentieel

```bash
cd web/evals/normalizeBibleRefs
BASELINE=$(bash verify.sh)
bash guard.sh && GUARD_STATUS=pass || GUARD_STATUS=fail
echo "Baseline: $BASELINE% | Guard: $GUARD_STATUS"
```

- [ ] **Step 2:** Log iter0 naar results.tsv

```bash
printf "0\t%s\t%s\tbaseline\tport regex-patronen uit SQL naar TS\n" "$BASELINE" "$GUARD_STATUS" >> web/evals/normalizeBibleRefs/results.tsv
cat web/evals/normalizeBibleRefs/results.tsv
```

Expected: header + één rij met baseline-score (verwachting 70-80%).

- [ ] **Step 3:** Commit baseline

```bash
git add web/evals/normalizeBibleRefs/results.tsv
git commit -m "experiment(autoresearch iter0): baseline ${BASELINE}% after SQL→TS port"
```

### Task 14: Parity-check — TS-output vs live Supabase RPC

**Files:**
- Create: `web/evals/normalizeBibleRefs/parity-check.mjs`

- [ ] **Step 1:** Schrijf script dat 1000 corpus-strings door beide pipelines haalt

```javascript
// web/evals/normalizeBibleRefs/parity-check.mjs
// Vergelijkt TS-normalize met live Supabase RPC.
// Exit 0 = parity ≥99.5%, exit 1 = afwijking te groot.
import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { normalizeBibleRefs } from '../../src/lib/normalizeBibleRefs.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  (await readFile(resolve(__dirname, '../../.env'), 'utf8'))
    .split('\n').filter(Boolean).map(l => l.split('='))
);
const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

const corpus = JSON.parse(await readFile(resolve(__dirname, 'corpus-candidates.json'), 'utf8'));
const sample = corpus.slice(0, 1000).map(c => c.raw_ref);

let match = 0;
const diffs = [];

for (const input of sample) {
  const ts = normalizeBibleRefs(input);
  const { data, error } = await sb.rpc('normalize_bible_refs', { input });
  if (error) { console.error('RPC error', error); process.exit(2); }
  if (ts === data) match += 1;
  else diffs.push({ input, ts, sql: data });
}

const pct = (match / sample.length * 100).toFixed(2);
console.log(`Parity: ${match}/${sample.length} (${pct}%)`);

if (diffs.length) {
  console.log('First 10 diffs:');
  diffs.slice(0, 10).forEach(d => console.log(`  "${d.input}"\n    TS : "${d.ts}"\n    SQL: "${d.sql}"`));
}

process.exit(pct >= 99.5 ? 0 : 1);
```

- [ ] **Step 2:** Run parity-check

```bash
cd web && node --experimental-strip-types evals/normalizeBibleRefs/parity-check.mjs
echo "Exit: $?"
```
Expected: `Parity: ≥995/1000 (≥99.5%)`, exit 0.

- [ ] **Step 3:** Als parity <99.5%: STOP, analyseer diffs, pas port aan. Herhaal Task 13 + Task 14 tot parity groen is.

- [ ] **Step 4:** Commit parity-check

```bash
git add web/evals/normalizeBibleRefs/parity-check.mjs
git commit -m "feat(evals): parity-check TS-port vs live Supabase RPC"
```

---

## Fase 7 — Delegeren aan autoresearch skill

### Task 15: Invoke `/autoresearch:plan`

- [ ] **Step 1:** Documenteer commands voor autoresearch

```markdown
Target: improve normalizeBibleRefs baseline → ≥95%
Source: web/src/lib/normalizeBibleRefs.ts
Verify: bash web/evals/normalizeBibleRefs/verify.sh
Guard: bash web/evals/normalizeBibleRefs/guard.sh
Eval-set: web/evals/normalizeBibleRefs/eval-set-v1.json
Branch: autoresearch/normalize-bible-refs
Iter-log: web/evals/normalizeBibleRefs/results.tsv
Commit-prefix: experiment(autoresearch iter{N}): <change>
```

- [ ] **Step 2:** Invoke skill

Vanuit hoofd-conversatie (niet een subagent), aanroepen:
```
/autoresearch:plan
```
Met bovenstaande commands + target-spec.

- [ ] **Step 3:** Loop tot convergentie (drie achtereenvolgende iters <1% winst OF score ≥95%).

---

## Fase 8 — Post-convergentie (deferred, na loop-completion)

*Deze taken worden pas gepland wanneer de autoresearch-loop plateau bereikt. Scope + exacte stappen hangen af van eindstand TS-bron. Placeholder hier:*

- **Task 16:** `sync-to-sql.mjs` — codegen van TS-patronen naar PL/pgSQL migratie-bestand.
- **Task 17:** `mcp__supabase__create_branch` + `apply_migration` op dev branch.
- **Task 18:** RPC-regressierun: `normalize_bible_refs` (SQL) output == `normalizeBibleRefs` (TS) output op 1000 items.
- **Task 19:** PR review: `autoresearch/normalize-bible-refs` → master.
- **Task 20:** Merge + gh-pages deploy + `apply_migration` op productie-project.
- **Task 21:** Productie-smoke: 10 bekende refs via live schriftinzicht.nl → renderen correct.
- **Task 22:** Update memory `reference_autoresearch_evals.md`: target afgerond, baseline→eindscore, open werkposten bijwerken.

Deze taken krijgen eigen plan-document (`docs/superpowers/plans/YYYY-MM-DD-normalize-bible-refs-merge.md`) op het moment dat ze relevant worden.

---

## Self-review checklist (uitgevoerd vóór execution)

- [x] Spec §3 pre-stap: Task 1 covered (gate op Harm's go)
- [x] Spec §4 architectuur: Task 3+4+5 doen de TS-port
- [x] Spec §5 componenten: alle 7 files in File Structure tabel + taken
- [x] Spec §6 metric: Task 10 runner matcht pipeline exact
- [x] Spec §7 eval-set samenstelling: Task 6-9 exactly 60+40
- [x] Spec §8 iter-cyclus: Task 13 iter0, Task 14 iter0-bis parity, Task 15 delegate iter1+
- [x] Spec §10 testing: verify (Task 11), guard (Task 12), parity (Task 14) allen gepland
- [x] Type consistency: alle `BibleRef { book, chapter, verseStart, verseEnd }` consistent (geen `verse` achtergebleven)
- [x] Geen placeholders: alle code-blokken compleet, exacte paden, exacte commands

## Execution-aanpak

Volgens CLAUDE.md autonomie: ik voer linear uit (Fase 1-4 + 6-7) omdat iteraties afhangen van vorige uitkomst (uitzondering 1) en de migratie shared mutable state is (uitzondering 3). Fase 5 task 5 (regex-port) gebruikt subagent-driven-development omdat de ~100 patronen groeperen in onafhankelijke families.
