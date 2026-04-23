# Autoresearch Tri-Track — Implementation Plan

> **Execution**: superpowers:subagent-driven-development. Elke track krijgt één subagent voor scaffolding + baseline. Iteraties daarna via `/autoresearch:plan` per track.

**Goal**: Drie autoresearch-loops parallel operationeel krijgen — parser-performance, OCR-correction accuracy, fuzzy duplicate detection. Eval-infra + baseline + guards per track; iteraties na baseline.

**Spec**: `docs/superpowers/specs/2026-04-23-autoresearch-tri-track.md`

---

## Fase 1 — Pre-stap (blokkeert Track E guard alleen)

### Task 1: Merge `autoresearch/expand-inline-refs` → master + deploy

*Wacht op expliciete go van Harm (productie-impact: gh-pages deploy).*

- [ ] Stap 1: `git checkout master && git pull --ff-only`
- [ ] Stap 2: `git merge --no-ff autoresearch/expand-inline-refs -m "merge: expandInlineRefs 66%→100%"`
- [ ] Stap 3: `git push origin master`
- [ ] Stap 4: `gh run watch` — wait for deploy success
- [ ] Stap 5: Verify `curl -sI https://schriftinzicht.nl/ | head -1` → `HTTP/2 200`

Zonder deze merge draaien Track O + D normaal door; Track E's guard.sh kan niet.

---

## Fase 2 — Parallelle scaffolding (subagent per track)

### Task 2: Track E scaffolding — parser-performance *(subagent E)*

**Subagent-prompt**:
> Scaffold autoresearch track parser-performance in `web/evals/parserPerf/` op branch `autoresearch/parser-perf` (van master).
>
> Volg bestaande conventies uit `web/evals/expandInlineRefs/` (runner, verify.sh pattern). Nieuw:
>
> 1. Branch maken, dir + `results.tsv` header
> 2. `bench-corpus-gen.mjs` → schrijft `bench-corpus.json` met 10000 items: 5000 uit live Supabase (stratified over author_id 2/10/15, `commentaries.commentary_text` chunks met book-ref-achtige patronen) + 5000 synthetic (cartesisch: BOOK_ALIASES × [1..30] × [1..180] + `:N` variaties).
> 3. `run.mjs` → laadt corpus, draait beide functies elk 5× over alle items, rapporteert median ns/call per functie. Output regel `Score: PARSE=Xns EXPAND=Yns` (score = `(PARSE+EXPAND)/2`, lager=beter).
> 4. `verify.sh` → extract score als bare number. **Omkeer-conventie**: score wordt de gemiddelde ns/call; autoresearch loop moet **lager** als beter interpreteren. Documenteer dit in commentaar.
> 5. `guard.sh` → draait zowel `../parseReference/run.mjs` als `../expandInlineRefs/run.mjs`, eist beide 100.0.
> 6. Run baseline; log iter0 naar `results.tsv`.
>
> Commits: `chore(evals): scaffold parserPerf` voor stap 1-5; `experiment(autoresearch iter0): baseline parser-perf Xns/Yns` voor stap 6.
>
> Blokker: guard.sh vereist dat branch `autoresearch/expand-inline-refs` gemerged is naar master. Als die merge nog niet is gedaan, skip stap 6 en rapporteer dat guard niet kan draaien; maak wel de files.

### Task 3: Track O scaffolding — OCR correction *(subagent O)*

**Subagent-prompt**:
> Scaffold autoresearch track OCR-correction in `web/evals/ocrCorrection/` op branch `autoresearch/ocr-correction` (van master).
>
> Nieuwe Python-runner (analoog aan `web/evals/attribution/run.py`). Specifieke stappen:
>
> 1. Branch maken, dir + `results.tsv` header, `.gitignore` voor `candidates-raw.json`
> 2. `sample-candidates.py` — query Supabase commentaries (author_id=2, lengte 200-800), random sample 120 rijen, output `candidates-raw.json` met `{id, raw_text}`.
> 3. **STOP** na stap 2 — labelwerk is handmatig. Produceer `candidates-for-labeling.md` met de 120 fragmenten genummerd en instructie aan Harm: selecteer 100 met zichtbare OCR-schade (gold-correcties nodig) + 20 zonder schade (clean-guard). Commit dit + baseline-set placeholder `eval-set-v1.json` met schema-header maar lege items-array. Meld dat labeling de gating-stap is.
> 4. Schrijf alvast `run.py` skeleton dat CER-metric berekent (gebruik `editdistance` of handmatige Levenshtein per regel + lengte-delen). `Score: X.X` op lengste-gewogen (1 - median_CER_after_fix) × 100. **Hoger = beter**.
> 5. Schrijf `verify.sh` en `guard.sh`:
>    - verify: `python run.py | grep '^Score:' | awk '{print $2}'`
>    - guard: pipeline moet 20 clean-items unchanged laten — exit 1 als ook maar één clean-item wijzigt.
>
> Commits: één commit per scaffold-stap.
>
> Rapportage: output "Track O: scaffolding klaar, 120 candidates geselecteerd, labeling wacht op Harm (handmatig werk)".

### Task 4: Track D scaffolding — duplicate detection *(subagent D)*

**Subagent-prompt**:
> Scaffold autoresearch track duplicate-detection in `web/evals/duplicateDetection/` op branch `autoresearch/dup-detection` (van master).
>
> Node-runner (JS, niet TS). Specifieke stappen:
>
> 1. Branch, dir + `results.tsv` header
> 2. `sample-pairs.mjs` — genereer 50 kandidaat-paren:
>    - 25 uit `audit_duplicates.py` output (exact-key duplicates — deze zijn per definitie `is_duplicate: true`)
>    - 25 near-miss non-dup paren: random sample waar zelfde `verse_id` maar andere `author_id`, OF zelfde `author_id` maar aangrenzende `verse_id`. Deze zijn `is_duplicate: false` tenzij handmatig anders gelabeld.
>    - Output: `pair-candidates.json` met `{id, row_a, row_b, exact_key_match: bool, suggested_label: bool}`.
> 3. **STOP** na stap 2 — labelwerk is handmatig. Produceer `pairs-for-labeling.md` met 50 paren en instructie aan Harm: bevestig/corrigeer suggested_label. Commit + baseline `eval-set-v1.json` met schema-header.
> 4. Schrijf `run.mjs` skeleton: per paar, classifier = `fuzzyEq(a.commentary_text, b.commentary_text)`. Stub `fuzzyEq` = huidige logica (trimmed exact match). Metric: precision, recall, F1. Output `Score: F1=X.XX P=Y.YY R=Z.ZZ`. Verify extract F1.
> 5. `verify.sh` en `guard.sh` (guard = precision ≥ 0.95, exit 1 anders)
>
> Rapportage: "Track D: scaffolding klaar, 50 pair-candidates, labeling wacht op Harm".

---

## Fase 3 — Baseline-run + hand-labeling gate

### Task 5: Harm labelt (blokkerend voor O + D)

Handmatig werk, buiten agent-scope. Output: `eval-set-v1.json` gevuld voor Track O (100+20 items) en Track D (50 items).

Track E heeft geen hand-labeling, baseline is automatisch zodra pre-stap merge gedaan is.

### Task 6: Per track — baseline meten + commit iter0

Zodra eval-set gevuld:
- Track E: `bash web/evals/parserPerf/verify.sh` → log iter0
- Track O: `bash web/evals/ocrCorrection/verify.sh` → log iter0
- Track D: `bash web/evals/duplicateDetection/verify.sh` → log iter0

---

## Fase 4 — Autoresearch loops (per track onafhankelijk)

### Task 7: Per track — invoke `/autoresearch:plan`

Voor elke track afzonderlijk:

```
/autoresearch:plan
Target: <track>
Verify: bash web/evals/<dir>/verify.sh
Guard: bash web/evals/<dir>/guard.sh
Source: <track-specifiek>
Branch: autoresearch/<track>
```

Loop tot klaar-wanneer-criterium uit spec §1.

---

## Fase 5 — Per track afsluiting (deferred)

Wanneer een track convergeert:
- PR naar master
- Deploy (alleen Track E raakt frontend-bundle; O en D zijn scripts/DB-jobs)
- Memory-update `reference_autoresearch_evals.md`: target als afgerond markeren

---

## Self-review

- [x] Spec §1 covers: E/O/D heeft eigen Task 2/3/4
- [x] Spec §2 shared infra: directory-conventies matchen bestaand `web/evals/` pattern
- [x] Spec §3 pre-stap: Task 1 — expliciet gated op Harm's go
- [x] Spec §4 volgorde: Fase 1 sequentieel, Fase 2 parallel
- [x] Geen placeholders — subagent-prompts specificeren outputs + commits
- [x] Type consistentie: alle tracks gebruiken conventie `Score: ...` bare-number parse

## Execution-aanpak

Fase 2 = drie parallelle subagents (onafhankelijke branches, disjoint files). Fase 1 sequentieel (productie-deploy gate). Fase 3-5 per track onafhankelijk zodra baseline gemeten.
