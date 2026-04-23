# Autoresearch Tri-Track — Parser Perf, OCR Correction, Duplicate Detection

**Datum**: 2026-04-23
**Project**: SchriftInzicht
**Status**: design — vervangt `2026-04-23-normalize-bible-refs-autoresearch.md` (afgeblazen wegens smalle scope, zie §0)
**Parent-plan**: `~/plans/2026-04-23-autoresearch-portfolio.md` (wordt herzien)

## 0. Waarom dit document het vorige vervangt

`normalize_bible_refs` bleek na verificatie via Supabase MCP een smalle full-name → Dutch-abbrev mapper (~104 `regexp_replace`, géén ranges, géén multi-ref, géén archaic). Nergens aangeroepen vanuit `web/`. ROI-kader (portfolio-plan §2): bug-klasse smal, impact-scope laag → target afgeblazen.

Harm's vraag "parser-efficiëntie en scrape→text?" opent drie sterker targets. Dit document specificeert alle drie parallel.

## 1. Targets

### Track E — Parser performance (`parseReference` + `expandInlineRefs`)

**Doel**: meetbaar lagere latency zonder correctheidsverlies voor de twee hot-path functies uit `web/src/lib/parseReference.ts` (regels 131 en 330). Beide worden bij elke commentary-render aangeroepen.

**Metric**: ns/call gemiddeld over 10.000-string benchmark (gemengd corpus + handcraft), gemeten via `performance.now()` met warmup + median-of-5.

**Guard**: bestaande eval-sets
- `web/evals/parseReference/run.mjs` → 100%
- `web/evals/expandInlineRefs/run.mjs` → 100%

**Eval-set / bench-set**:
- 10.000 strings: 5.000 corpus-samples (extract uit commentaries + kanttekeningen) + 5.000 synthetic (book+chapter:verse permutaties)
- Gegenereerd door `bench-corpus.mjs`, opgeslagen als `bench-corpus.json`

**Iteratie-ruimte**:
- Cache gecompileerde regex (huidig: on-the-fly?)
- Pre-compile BOOK_ALIASES lookup-trie
- Token-based parser in plaats van multi-pass regex
- Bail-early op korte inputs die zeker geen ref bevatten

**Klaar wanneer**: ≥3× speedup op beide functies, beide guard-evals 100%, geen significante bundle-size toename.

### Track O — OCR correction accuracy

**Doel**: kwaliteit verhogen van OCR-correctie-output op commentary-tekst. Huidig script `fix_ocr_extended.py` werkt op 2 specifieke `.txt` files met hand-curated patronen. Breed uitrollen vereist systematische evaluatie.

**Scope-keuze**: target = **DB-brede OCR-fixer voor `commentaries.commentary_text`** (author_id=2 Calvijn eerst, 5139 rijen), niet de 2 bestaande `.txt` files. De 2 bestaande files blijven als regressietest beschikbaar.

**Metric**: character error rate (CER) reductie tegen 100 gold-standard paren
- Input: ruwe OCR-tekst uit commentary-rij
- Expected: handmatig gecorrigeerde versie (gold)
- Score = `(1 - median_CER_after_fix) × 100`

**Guard**: precision — geen enkele fix mag een woord corrumperen dat al correct was. Gold-set bevat 20 "clean" items; fix-pass op die items moet `output == input` opleveren.

**Eval-set opbouw**:
- Sample 120 random commentary-fragmenten (author_id=2, lengte 200-800 chars)
- Filter op zichtbare OCR-schade (visuele inspectie)
- 100 gecorrigeerd handmatig (gold)
- 20 zonder OCR-schade (clean-guard subset)

**Iteratie-ruimte**:
- Uitbreiding pattern-library (uit `fix_ocr_extended.py`)
- Context-window dictionary-matching (hunspell-NL)
- LLM-based correction per paragraaf (kostbaar, pas laat)

**Klaar wanneer**: CER-reductie ≥80% tegen gold, clean-guard 100% onveranderd.

### Track D — Duplicate detection (fuzzy)

**Doel**: fuzzy near-duplicate detectie voor commentaries. Huidige `audit_duplicates.py` doet alleen exact-key matching (`author_id + verse_id + scope`). Werkelijke duplicates hebben vaak kleine verschillen (extra whitespace, verschillende dashes, OCR-drift) die exact-match niet vangt.

**Scope**: pair-level classifier op (row_a, row_b) → `is_duplicate: bool`. Stage-1 filtering blijft exact-key; stage-2 vergelijking is fuzzy.

**Metric**: F1 op gelabelde pair-set
- 50 paar-items handmatig gelabeld: 25 true-dup, 25 non-dup (near-miss: zelfde vers, andere commentator; of zelfde commentator, andere scope)
- Score = F1 × 100

**Guard**: precision ≥0.95 (liever missen dan false-merges aanmaken)

**Eval-set opbouw**:
- Query `audit_duplicates.py` output op huidige exact-match duplicaten
- Random sample 40 + 10 near-miss non-dup paren uit cross-author samples
- Handmatig labelen met notitie waarom

**Iteratie-ruimte**:
- Whitespace + punctuation-normalisatie vóór compare
- Levenshtein / token Jaccard / cosine similarity
- Embedding-based (pas laat — overkill voor dit volume)
- Rule-based exclusies (verschillende authors = nooit dup)

**Klaar wanneer**: F1 ≥0.90 op labeled set, precision ≥0.95.

## 2. Gedeelde infrastructuur

**Directory per track**:
```
web/evals/parserPerf/
web/evals/ocrCorrection/
web/evals/duplicateDetection/
```

Standaard files per track (conform bestaande conventie): `eval-set-v1.json`, `run.mjs` of `run.py`, `verify.sh`, `guard.sh`, `results.tsv`.

**Branches**:
- `autoresearch/parser-perf`
- `autoresearch/ocr-correction`
- `autoresearch/dup-detection`

Geen conflict-risico — drie tracks raken disjoint files.

## 3. Pre-stap

Merge `autoresearch/expand-inline-refs` → master + push → gh-pages deploy. Blokkeert Track E (heeft de guard-eval-sets nodig). Externe impact: productie-deploy schriftinzicht.nl. Wacht op expliciete go van Harm.

Zonder merge kan Track E niet starten; Tracks O en D kunnen parallel wel alvast gescaffold worden.

## 4. Volgorde & parallelisatie

Fase 1 (sequentieel): pre-stap merge.

Fase 2 (parallel, via subagent-driven-development): per track scaffolding
- Track E: scaffold, bench-corpus genereren, baseline meten
- Track O: scaffold, gold-set handmatig op te stellen (duurt het langst)
- Track D: scaffold, label pair-set

Fase 3 (per track onafhankelijk): `/autoresearch:plan` invoken, loop tot klaar-wanneer-criterium.

Fase 4 (per track): PR → master, deploy (indien relevant), memory-update.

## 5. Risico's gemeenschappelijk

| Risico | Mitigatie |
|---|---|
| Gold-set labeling (Track O) kost meer dan ingeschat | Start Track O gold-set als eerste handmatig werk; parallel Tracks E+D scaffold |
| Track E bench-corpus overfit op één commentator | Stratificatie over 3 authors (Calvijn/Henry/Dachsel) bij corpus-sampling |
| Track D pair-set selection bias | 50/50 true-dup/near-miss quota afgedwongen tijdens labeling |
| Drie branches drift ver van master bij lange iteraties | Weekly rebase-check; merge-conflicten op `web/evals/` onwaarschijnlijk (disjoint dirs) |

## 6. Vervolg na tri-track

Portfolio-plan herziening (~/plans/2026-04-23-autoresearch-portfolio.md) na afsluiting: update volgorde-tabel, markeer targets afgerond, evalueer of MI Platform Gmail-classifier (Tier 1 #2) volgende slot krijgt.
