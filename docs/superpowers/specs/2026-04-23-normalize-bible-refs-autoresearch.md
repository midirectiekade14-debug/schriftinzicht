# Autoresearch loop — `normalize_bible_refs`

**Datum**: 2026-04-23
**Project**: SchriftInzicht
**Status**: design — klaar voor implementatieplan
**Parent-plan**: `~/plans/2026-04-23-autoresearch-portfolio.md` — Tier 1, target #1

## 1. Doel

Een Karpathy-style autoresearch loop opzetten voor de bijbel-ref normalisatiefunctie (`normalize_bible_refs`, momenteel PL/pgSQL in Supabase). Meetbaar verbeteren hoe ruwe verwijzingen in commentaren en kanttekeningen worden omgezet tot canonical-parseable refs, zodat downstream tools (`parseReference`, `expandInlineRefs`, kanttekeningen-linking, catechism proof-matching) betrouwbaarder werken.

## 2. Scope

**In scope**:
- Port van bestaande ~100 regex-patronen uit PL/pgSQL naar TS als nieuwe bron-van-waarheid (`web/src/lib/normalizeBibleRefs.ts`).
- Eval-set van 100 items (60 uit live corpus + 40 handcraft edge cases).
- Runner, verify, guard scripts volgens SchriftInzicht eval-conventie.
- SQL-codegen script dat uit de TS-bron een migratie-bestand regenereert bij convergentie.
- Iteratie-loop via `/autoresearch` skill op branch `autoresearch/normalize-bible-refs`.

**Out of scope**:
- Attribution-target rebalance (apart werkpost, portfolio-plan §7.1).
- Kanttekeningen → verse linking target (portfolio-plan §5.1, volgt later).
- Wijzigingen aan `parseReference` (werkt als guard, wordt niet aangepakt).

## 3. Pre-stap

Merge `autoresearch/expand-inline-refs` → master en redeploy gh-pages. Deze branch staat open sinds 2026-04-21 met bestaande eval-infra (5 commits: 3× chore(evals), 2× experiment iter1/iter2 op de `expandInlineRefs` target). Mergen vóór nieuwe target-branch voorkomt dat de nieuwe eval-infra op een fork-van-een-branch leeft.

**Externe impact**: merge triggert gh-pages deploy naar schriftinzicht.nl. Wacht op expliciete go van Harm voor uitvoering (feedback memory: externe diensten bevestigen).

## 4. Architectuur

**Bron-van-waarheid verschuift van SQL naar TS.** Tijdens autoresearch-iteraties draait alles lokaal in TS (seconden per iter). De PL/pgSQL-functie wordt pas bij convergentie geregenereerd en één-shot verifieerd via Supabase RPC.

```
web/src/lib/normalizeBibleRefs.ts               ← bron-van-waarheid (nieuw)
  │
  ├─ tijdens loop: eval-runner importeert direct
  │
  └─ bij convergentie: sync-to-sql.mjs genereert
       supabase/migrations/NNNN_normalize_bible_refs.sql
       → apply_migration via Supabase MCP
       → RPC-regressierun ter bevestiging
```

## 5. Componenten

| Component | Pad | Rol |
|---|---|---|
| TS normalize | `web/src/lib/normalizeBibleRefs.ts` | Geport uit SQL, ~100 regex-patronen, signature `(input: string) => string` |
| Eval-set | `web/evals/normalizeBibleRefs/eval-set-v1.json` | 100 items: `{input, expected: {book, chapter, verse}}` |
| Runner | `web/evals/normalizeBibleRefs/run.mjs` | Node 25.6+ TS-stripping; draait `parseReference(normalize(item.input))` vergelijkt met expected |
| Verify | `web/evals/normalizeBibleRefs/verify.sh` | Bare-number score (autoresearch Verify-veld) |
| Guard | `web/evals/normalizeBibleRefs/guard.sh` | Draait `parseReference` eval-set; exit 1 als score < 100% (autoresearch Guard) |
| SQL sync | `web/evals/normalizeBibleRefs/sync-to-sql.mjs` | Converteert TS-patronen → PL/pgSQL-body, schrijft migratie-file |
| Iter log | `web/evals/normalizeBibleRefs/results.tsv` | Kolommen: `iter`, `score`, `guard`, `decision`, `change` |

## 6. Metric & data flow

Per eval-item:

```
type Ref = { book: string, chapter: number, verse?: number }

item = {
  input: string,
  expected: Ref | Ref[]    // array voor multi-ref inputs (bv. "Rom. 8:1, 3")
}

pipeline:
  normalized   = normalizeBibleRefs(item.input)
  parsed       = parseReference(normalized)      // bestaand contract: Ref | Ref[]
  pass         = set_equal(parsed, item.expected)  // volgorde-onafhankelijk voor arrays

score = (#passes / #items) × 100
```

Metric-keuze: functionele validatie via `parseReference` (zie design-brainstorm, optie B). Eval-set specificeert alleen `{book, chapter, verse}`, geen exact-canonical string — dat maakt de eval robuust tegen legitieme format-varianten. `verse` is optioneel om chapter-only refs (`Ps. 23`) en boek-only refs (`Esther`) te ondersteunen.

## 7. Eval-set samenstelling

**60 corpus items** — geëxtraheerd uit live Supabase-corpus:
- Query `commentaries.commentary_text` + `kanttekeningen.note_text` op ref-patronen (regex `/\b[1-3]?\s?[A-Z][a-z]+\.?\s+\d+:\d+/` startpoint).
- Random sample van 120 candidates → handmatig 60 behouden met mix: ~30 nu-werkend + ~30 nu-falend.

**40 handcraft edge cases**:

| Categorie | Voorbeelden | Aantal |
|---|---|---|
| Verse-ranges | `Joh. 3:16-17`, `Rom 8:1–5` | 6 |
| Chapter-cross | `3:1–4:2`, `Joh. 1:1–2:11` | 4 |
| Abbreviaties | `1Kor`, `Openb.`, `Ps.`, `1 Thess` | 6 |
| Multi-ref | `Rom. 8:1, 3`, `Gen 1:1; 2:4` | 5 |
| Spatie-varianten | `Joh. 3 : 16`, `Jes 28 : 28` | 4 |
| NL/EN varianten | `Revelation 5:6`, `Genesis 1:1` | 4 |
| Chapter-only | `Ps. 23`, `Spr 1` | 3 |
| Boek-only | `Esther`, `Ruth` | 2 |
| Archaïsche afk. | `Ie`, `Ij`, `1 B. Mos.` | 4 |
| Whitespace-schade | `Joh.\n3:16`, `Rom.  8:1` | 2 |

## 8. Iter-cyclus

| Iter | Actie | Verwachte uitkomst |
|---|---|---|
| 0 | Port ~100 SQL-regex-patronen naar TS; draai eval | Baseline 70-80% |
| 0-bis | Parity-check: draai TS-normalize op 1000 corpus-strings, vergelijk met live RPC-output | ≥99.5% match; zo niet: patterns fixen vóór iter1 |
| 1..N | Regex-tweaks in TS (één coherente change per iter), draai eval + guard | Monotoon stijgend; guard blijft groen; regressie → verwerp iter |
| convergentie | Score plateau bereikt (drie achtereenvolgende iters <1% winst) | Klaar voor sync |
| sync | `sync-to-sql.mjs` genereert migratie, diff reviewen | Migratie-bestand gereed |
| verificatie | `apply_migration` op dev branch (Supabase MCP), RPC-run 100-item sample | TS-output = SQL-output voor alle items |
| merge | PR `autoresearch/normalize-bible-refs` → master, merge + deploy gh-pages, `apply_migration` op prod | schriftinzicht.nl draait nieuwe normalizer |

## 9. Risico's en mitigaties

| Risico | Mitigatie |
|---|---|
| Iter0 (100 patronen porten) kost meer dan 1 dag | Subagent-driven-development: scope-gelimiteerde subagents per regex-groep (ranges, abbreviaties, etc.) |
| PL/pgSQL regex-gedrag wijkt af van JS-regex (lookbehind, POSIX-classes, greedy-verschillen) | Iter0-bis parity-check: 1000-item RPC-vs-TS sample; afwijking > 0.5% blokkeert voortgang |
| Regex-overfit op eval-set | Stratificatie 60/40 corpus/handcraft. Kwartaal-hersample: 50 nieuwe corpus-items valideren dat score stabiel blijft |
| Drift tussen TS-bron en SQL-migratie tussen merges | `sync-to-sql.mjs` + `git diff --exit-code` in CI op elke PR die `normalizeBibleRefs.ts` raakt |
| Live RPC-run bij convergentie raakt productie | Eerst tegen Supabase dev-branch via `mcp__supabase__create_branch` + `apply_migration`, pas na OK naar prod |
| Parse-via-parseReference verbergt normalize-bugs (normalize produceert iets dat verkeerd maar wél parseerbaar is) | Geaccepteerd: de metric meet pipeline-correctheid, niet canonical-form esthetiek. Handmatige steekproef op 20 items aan het eind van convergentie bevestigt dat genormaliseerde strings ook menselijk-leesbaar canonical zijn |

## 10. Testing

| Moment | Test |
|---|---|
| Per iter | `verify.sh` (score) + `guard.sh` (parseReference blijft 100%) |
| Iter 0-bis | Parity-run TS-normalize vs live Supabase-RPC op 1000 corpus-strings |
| Bij convergentie | RPC-regressie: TS-output == SQL-output op nieuwe 1000-item sample |
| Pre-merge | `npm run build` groen, bestaande unit tests passeren |
| Post-merge | Productie-smoke: 10 bekende ref-strings via live schriftinzicht.nl |

## 11. Conventies (overgenomen uit bestaande SchriftInzicht evals)

- Runner `.mjs` importeert TS-bron direct via Node 25.6+ native TS-stripping (geen tsx).
- `verify.sh` output = bare number (autoresearch Verify parsed dit).
- Scripts gebruiken `dirname "$0"` voor path-onafhankelijkheid op Windows bash.
- Branch-naam: `autoresearch/normalize-bible-refs`.
- Commit-prefix iteraties: `experiment(autoresearch iter{N}): <korte beschrijving>`.
- Commits voor eval-infra: `chore(evals): <beschrijving>`.

## 12. Klaar wanneer

- Score-plateau bereikt (baseline ~70-80% → doel ≥95%).
- Guard (`parseReference` eval) consistent 100% door hele loop.
- RPC-regressierun: TS == SQL op 1000-item sample.
- Migratie gemerged en op productie toegepast.
- Portfolio-plan §9 volgorde-item #1 kan als "done" gemarkeerd.

## 13. Vervolg-targets afhankelijk van dit werk

- Portfolio-plan §5.1 — kanttekeningen → verse linking (leunt op `normalize_bible_refs`).
- Portfolio-plan §7.1 — attribution rebalance (parallel traject, niet-blokkerend).
