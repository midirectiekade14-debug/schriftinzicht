# Catechismus: letter-markers & terug-navigatie — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Maak letters (a/b/c) in catechismus-antwoorden zichtbaar als superscript-markers, open bewijsteksten als popover, en zorg dat gebruikers vanuit Catechismus en Preekvoorbereiding zonder context-verlies kunnen terugkeren vanuit de bijbelpagina.

**Architecture:** Pure-function marker-parser in Catechismus; hergebruik van bestaande `VersePopup` component; `location.state`-patroon voor terug-navigatie zonder nieuwe globale store.

**Tech Stack:** React 18, React Router v6, TypeScript, Vite, Supabase. Geen testing framework aanwezig — manueel testplan volgens spec.

**Spec:** `docs/superpowers/specs/2026-04-24-catechismus-markers-return-design.md`

**Files gewijzigd:**
- `src/pages/Catechismus.tsx` — parser, popup state, returnState, restore-effect
- `src/components/VersePopup.tsx` — `returnState` doorgeef-prop
- `src/pages/Verzen.tsx` — dynamische back-link op basis van `location.state`
- `src/pages/Preekvoorbereiding.tsx` — state op 2 Links + restore-effect
- `src/index.css` — `.cat-marker` styling

---

## Task 1: Letter-marker parser + styling

**Files:**
- Modify: `src/pages/Catechismus.tsx:50-69` (herschrijf `formatAnswer`)
- Modify: `src/index.css` (voeg `.cat-marker` toe)

- [ ] **Step 1: Vervang `formatAnswer` in `src/pages/Catechismus.tsx`**

Verwijder de bestaande `formatAnswer` (regels 50-69) en vervang door:

```tsx
/** Format antwoordtekst: markeer losse letters (a, b, c, ...) als superscript-badges.
 *  De letters in de HC-antwoorden verwijzen naar bewijstekst-groepen en lopen sequentieel.
 *  We zoeken letter-voor-letter naar word-boundary matches; missing letter → klaar.
 */
function formatAnswer(text: string) {
  if (!text) return text;
  const nodes: React.ReactNode[] = [];
  let pos = 0;
  let letterIdx = 0;
  const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

  while (letterIdx < LETTERS.length) {
    const L = LETTERS[letterIdx];
    const rest = text.slice(pos);
    // Letter moet omringd zijn door whitespace of leestekens aan beide kanten.
    const re = new RegExp(`(?<=[\\s,;:.])${L}(?=[\\s,;:.])`);
    const m = re.exec(rest);
    if (!m) break;
    const absIdx = pos + m.index;
    if (absIdx > pos) nodes.push(text.slice(pos, absIdx));
    nodes.push(<sup key={`cm-${L}`} className="cat-marker">{L}</sup>);
    pos = absIdx + 1;
    letterIdx++;
  }
  if (pos < text.length) nodes.push(text.slice(pos));

  if (nodes.length === 0) return text;
  return <>{nodes}</>;
}
```

Voeg `React` import toe bovenaan (als nog niet aanwezig — controleer regel 1):

```tsx
import React, { useEffect, useState } from 'react';
```

- [ ] **Step 2: Voeg `.cat-marker` styling toe in `src/index.css`**

Zoek de bestaande `.kant-marker` regel (gebruik Grep: `kant-marker {` in index.css). Voeg direct daarna toe:

```css
.cat-marker {
  font-size: 0.7em;
  font-weight: 600;
  color: var(--color-accent, #8B5A2B);
  margin: 0 0.15em;
  vertical-align: super;
  line-height: 0;
  font-style: normal;
}
```

Als de variabele `--color-accent` niet bestaat in het project, vervang door een hardcoded kleur die past bij de huidige styling van `.kant-marker` — controleer door `.kant-marker` te lezen.

- [ ] **Step 3: Handmatige verificatie**

Run: `cd ~/projects/schriftinzicht/web && npm run dev`
Open: http://localhost:5173/catechismus
Controleer:
- Vraag 1 open-klappen → letters a–j zichtbaar als superscript-badges, geen losse "a b c" meer tussen woorden.
- Vraag 2 open-klappen → a–d als badges.
- Een korte vraag zonder letters → antwoord ongewijzigd.

- [ ] **Step 4: Build-check**

Run: `cd ~/projects/schriftinzicht/web && npm run build`
Expected: succesvol, geen TypeScript-errors.

- [ ] **Step 5: Commit**

```bash
cd ~/projects/schriftinzicht
git add web/src/pages/Catechismus.tsx web/src/index.css
git commit -m "feat(catechismus): mark a/b/c letters as superscript markers in answers"
```

---

## Task 2: Bewijstekst popover in Catechismus

**Files:**
- Modify: `src/components/VersePopup.tsx` (voeg `returnState` prop toe)
- Modify: `src/pages/Catechismus.tsx` (Link → button + popup state)

- [ ] **Step 1: Voeg `returnState` prop toe aan `VersePopup`**

In `src/components/VersePopup.tsx`, breid de `Props` interface uit (regel 15-22):

```tsx
interface Props {
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number;
  anchorRect: DOMRect;
  onClose: () => void;
  returnState?: unknown;
}
```

Destructure de nieuwe prop in de component-signatuur (regel 24):

```tsx
export default function VersePopup({ book, chapter, verseStart, verseEnd, anchorRect, onClose, returnState }: Props) {
```

Geef `returnState` door aan de interne Link (regel 128):

```tsx
<Link to={chapterHref} className="verse-popup-link" onClick={onClose} state={returnState}>
  Open hoofdstuk &rsaquo;
</Link>
```

- [ ] **Step 2: Update `Catechismus.tsx` — import VersePopup en state**

Bovenaan `src/pages/Catechismus.tsx`, voeg import toe:

```tsx
import VersePopup from '../components/VersePopup';
```

In de `Catechismus` component, voeg state toe naast de bestaande useState-calls:

```tsx
const [versePopup, setVersePopup] = useState<{
  book: string;
  chapter: number;
  verseStart: number;
  rect: DOMRect;
  questionId: string;
  questionNumber: number;
} | null>(null);
```

- [ ] **Step 3: Vervang Link door button in `cat-proofs-list`**

Zoek het bestaande blok (regel 220-228 ongeveer, `<Link ... className="cat-proof-ref">`). Vervang:

```tsx
{proofTexts[String(q.id)].map(p => (
  <button
    key={p.id}
    type="button"
    className="cat-proof-ref"
    onClick={(e) => {
      const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
      setVersePopup({
        book: p.bookName,
        chapter: p.chapter,
        verseStart: p.verse,
        rect,
        questionId: String(q.id),
        questionNumber: q.question_number,
      });
    }}
  >
    {displayBookName(p.bookName)} {p.chapter}:{p.verse}
  </button>
))}
```

- [ ] **Step 4: Render VersePopup onderaan het component**

Voeg vlak voor de sluitende `</>` van de return (na `</div>` van `className="page"`), toe:

```tsx
{versePopup && (
  <VersePopup
    book={versePopup.book}
    chapter={versePopup.chapter}
    verseStart={versePopup.verseStart}
    anchorRect={versePopup.rect}
    onClose={() => setVersePopup(null)}
  />
)}
```

(De `returnState` prop laten we leeg in deze task — komt in Task 3.)

- [ ] **Step 5: CSS aanpassen voor button-styling**

De class `cat-proof-ref` was eerder op een `<Link>` (a-tag), nu op een `<button>`. Zoek `.cat-proof-ref` in `src/index.css`. Voeg toe of pas aan:

```css
.cat-proof-ref {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font: inherit;
  /* behoud bestaande color / text-decoration van de huidige .cat-proof-ref regel */
}
```

Als de bestaande regel `color`, `text-decoration` of `font-size` definieert — behoud die waarden; voeg alleen bovenstaande button-reset properties toe.

- [ ] **Step 6: Verwijder Link import als niet meer gebruikt**

Controleer of `Link` nog ergens gebruikt wordt in `Catechismus.tsx`. Zo niet, verwijder uit de import (`import { Link } from 'react-router-dom'` → helemaal weg, want er was niks anders). Zo wel, laat staan.

- [ ] **Step 7: Handmatige verificatie**

Run: `npm run dev` in `web/`
- Klik op Bewijstekst in open-geklapte vraag → popover verschijnt met vers.
- Klik buiten popover → popover sluit.
- Escape toets → popover sluit.
- "Open hoofdstuk ›" → navigeert naar `/bijbel/:book/:ch` (back-link zal nog hardcoded zijn — OK voor nu).

- [ ] **Step 8: Build-check**

Run: `npm run build`
Expected: succesvol.

- [ ] **Step 9: Commit**

```bash
cd ~/projects/schriftinzicht
git add web/src/components/VersePopup.tsx web/src/pages/Catechismus.tsx web/src/index.css
git commit -m "feat(catechismus): open proof texts in popover instead of navigating"
```

---

## Task 3: Dynamische back-link in `Verzen.tsx`

**Files:**
- Modify: `src/pages/Verzen.tsx` (3 back-link plekken: regel 298-299, 310-311, 321-322)

- [ ] **Step 1: Definieer ReturnState type**

Bovenaan in `src/pages/Verzen.tsx`, na de imports, voeg toe:

```tsx
type ReturnState = {
  returnTo: string;
  returnLabel: string;
  returnScrollY: number;
  returnExpandedId?: string;
};
```

- [ ] **Step 2: Lees `location.state` in de component**

Zoek `const navigate = useNavigate();` (regel 75). Voeg er direct na toe (importeer `useLocation` uit `react-router-dom` als nog niet geïmporteerd — check regel 2):

```tsx
const location = useLocation();
const returnState = location.state as ReturnState | null;
```

Update import regel 2 als nodig:

```tsx
import { Link, useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
```

(Het is mogelijk dat `useLocation` al geïmporteerd is — controleer eerst.)

- [ ] **Step 3: Definieer een render-helper voor de back-link**

Vlak voor de `if (loading)` return-blokken, voeg toe:

```tsx
const backLinkEl = returnState?.returnTo ? (
  <button
    type="button"
    className="back-link"
    onClick={() => navigate(returnState.returnTo, {
      state: {
        restoreScrollY: returnState.returnScrollY,
        restoreExpandedId: returnState.returnExpandedId,
      },
    })}
  >
    &lsaquo; Terug naar {returnState.returnLabel}
  </button>
) : (
  <Link to={`/bijbel/${bookId}?name=${encodeURIComponent(bookName)}&chapters=${chapterCount || 999}`} className="back-link">
    &lsaquo; {bookName}
  </Link>
);
```

- [ ] **Step 4: Vervang de 3 hardcoded back-links**

Op regel 298-299, 310-311, en 321-322 staat steeds dezelfde `<Link ... className="back-link">...</Link>`. Vervang alle drie door `{backLinkEl}`.

Voorbeeld (regel 297-300):

```tsx
// VOOR:
<div className="screen-header">
  <Link to={`/bijbel/${bookId}?name=${encodeURIComponent(bookName)}&chapters=${chapterCount || 999}`} className="back-link">&lsaquo; {bookName}</Link>
</div>

// NA:
<div className="screen-header">
  {backLinkEl}
</div>
```

- [ ] **Step 5: CSS-check voor button-variant**

Het was een `<Link>` (a-tag), nu kan het een `<button>` zijn. Zoek `.back-link` in `src/index.css`. Voeg aan die regel toe (of in een aparte regel direct daarna):

```css
.back-link {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font: inherit;
  /* behoud bestaande kleur, decoration, etc. */
}
```

Alleen toevoegen als de bestaande regel deze properties niet al heeft. Anders alleen die die ontbreken.

- [ ] **Step 6: Handmatige verificatie**

Run: `npm run dev`
- Bezoek `/bijbel/43/3` (Johannes 3) direct via URL → back-link toont "← Johannes" (bestaand gedrag, `location.state` is null).
- Navigatie via Hoofdstukken → Verzen werkt nog.

- [ ] **Step 7: Build-check**

Run: `npm run build`

- [ ] **Step 8: Commit**

```bash
cd ~/projects/schriftinzicht
git add web/src/pages/Verzen.tsx web/src/index.css
git commit -m "feat(verzen): support dynamic back-link via location.state"
```

---

## Task 4: Catechismus returnState + restore

**Files:**
- Modify: `src/pages/Catechismus.tsx` (returnState doorgeven, useEffect voor restore)

- [ ] **Step 1: Voeg useLocation import toe**

Bovenaan `src/pages/Catechismus.tsx`, update de react-router import:

```tsx
import { useLocation, useNavigate } from 'react-router-dom';
```

In de component, naast bestaande state:

```tsx
const location = useLocation();
const navigate = useNavigate();
```

- [ ] **Step 2: Bouw returnState object per popup-instance**

In de `VersePopup` render (zoals toegevoegd in Task 2 Step 4), voeg de prop toe:

```tsx
{versePopup && (
  <VersePopup
    book={versePopup.book}
    chapter={versePopup.chapter}
    verseStart={versePopup.verseStart}
    anchorRect={versePopup.rect}
    onClose={() => setVersePopup(null)}
    returnState={{
      returnTo: '/catechismus',
      returnLabel: `Catechismus (Vraag ${versePopup.questionNumber})`,
      returnScrollY: window.scrollY,
      returnExpandedId: versePopup.questionId,
    }}
  />
)}
```

`returnExpandedId` is de database-id (string) van de vraag waar de popover van kwam — precies de vraag die bij terugkeer open moet staan. Matcht het key-format van de `expanded` state.

- [ ] **Step 3: Voeg restore useEffect toe**

Voeg na de bestaande `useEffect` voor data-load (rond regel 79-128), een nieuwe useEffect toe:

```tsx
useEffect(() => {
  if (loading) return;
  const restore = location.state as { restoreScrollY?: number; restoreExpandedId?: string } | null;
  if (!restore) return;

  if (restore.restoreExpandedId) {
    setExpanded(prev => ({ ...prev, [restore.restoreExpandedId!]: true }));
  }
  if (typeof restore.restoreScrollY === 'number') {
    const y = restore.restoreScrollY;
    requestAnimationFrame(() => window.scrollTo(0, y));
  }

  // Scrub state zodat refresh of verder-navigeren de state niet hergebruikt.
  navigate(location.pathname, { replace: true, state: null });
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [loading]);
```

- [ ] **Step 4: Handmatige verificatie end-to-end**

Run: `npm run dev`
1. Ga naar `/catechismus`, klap Vraag 7 open (of een andere met bewijsteksten), scroll iets.
2. Klik op een bewijstekst → popover verschijnt.
3. Klik "Open hoofdstuk" → navigeert naar `/bijbel/...`, back-link zegt "← Terug naar Catechismus (Vraag 7)".
4. Klik back-link → terug op `/catechismus`, vraag blijft open, scroll-positie hersteld.
5. Na terugkeer: refresh de pagina → vraag is weer ingeklapt, geen state-leak.

- [ ] **Step 5: Build-check**

Run: `npm run build`

- [ ] **Step 6: Commit**

```bash
cd ~/projects/schriftinzicht
git add web/src/pages/Catechismus.tsx
git commit -m "feat(catechismus): restore scroll and open question on return from bible"
```

---

## Task 5: Preekvoorbereiding returnState + restore

**Files:**
- Modify: `src/pages/Preekvoorbereiding.tsx` (state op 2 Links, restore-effect)

- [ ] **Step 1: Voeg useLocation import toe**

Bovenaan `src/pages/Preekvoorbereiding.tsx`, controleer en update imports:

```tsx
import { Link, useSearchParams, useLocation, useNavigate } from 'react-router-dom';
```

In de component, naast bestaande state:

```tsx
const location = useLocation();
const navigate = useNavigate();
```

(Waarschijnlijk bestaan deze al deels — `useSearchParams` is er in ieder geval. Alleen toevoegen wat ontbreekt.)

- [ ] **Step 2: Bouw een returnState helper**

Vlak voor de return-statement (ergens rond regel 300-350, waar andere helpers staan), voeg toe:

```tsx
const buildReturnState = () => ({
  returnTo: location.pathname + location.search,
  returnLabel: 'Preekvoorbereiding',
  returnScrollY: window.scrollY,
});
```

- [ ] **Step 3: Voeg state toe aan de vers-link op regel 587**

Huidige code:

```tsx
<Link
  to={`/bijbel/${v.book_id}/${v.chapter}?name=${encodeURIComponent(vBookName)}&hlStart=${v.verse}&hlEnd=${v.verse}`}
  className="pv-comm-verse-label"
  onClick={e => e.stopPropagation()}
>{vLabel}</Link>
```

Vervang door:

```tsx
<Link
  to={`/bijbel/${v.book_id}/${v.chapter}?name=${encodeURIComponent(vBookName)}&hlStart=${v.verse}&hlEnd=${v.verse}`}
  className="pv-comm-verse-label"
  onClick={e => e.stopPropagation()}
  state={buildReturnState()}
>{vLabel}</Link>
```

- [ ] **Step 4: Voeg state toe aan de vers-link op regel 681**

Huidige code:

```tsx
<Link
  to={`/bijbel/${v.book_id}/${v.chapter}?name=${encodeURIComponent(vBookName)}&hlStart=${v.verse}&hlEnd=${v.verse}`}
  className="pv-kant-verse"
>vs. {v.verse}</Link>
```

Vervang door:

```tsx
<Link
  to={`/bijbel/${v.book_id}/${v.chapter}?name=${encodeURIComponent(vBookName)}&hlStart=${v.verse}&hlEnd=${v.verse}`}
  className="pv-kant-verse"
  state={buildReturnState()}
>vs. {v.verse}</Link>
```

- [ ] **Step 5: Voeg restore useEffect toe**

Voeg een nieuwe useEffect toe na de bestaande hooks (onderaan de hooks-blokken, vóór de render-return):

```tsx
useEffect(() => {
  if (loading) return;
  const restore = location.state as { restoreScrollY?: number } | null;
  if (!restore) return;

  if (typeof restore.restoreScrollY === 'number') {
    const y = restore.restoreScrollY;
    requestAnimationFrame(() => window.scrollTo(0, y));
  }

  navigate(location.pathname + location.search, { replace: true, state: null });
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [loading]);
```

- [ ] **Step 6: Handmatige verificatie**

Run: `npm run dev`
1. Ga naar `/preekvoorbereiding?q=Romeinen+8:28`, laat data laden.
2. Klap een verklaring uit met een "vs. X" link zichtbaar.
3. Scroll naar beneden.
4. Klik een "vs. X" vers-link → navigeert naar `/bijbel/...`, back-link zegt "← Terug naar Preekvoorbereiding".
5. Klik back-link → terug op `/preekvoorbereiding?q=...`, scroll-positie hersteld, query behouden.

- [ ] **Step 7: Build-check**

Run: `npm run build`

- [ ] **Step 8: Commit**

```bash
cd ~/projects/schriftinzicht
git add web/src/pages/Preekvoorbereiding.tsx
git commit -m "feat(preekvoorbereiding): restore scroll on return from bible"
```

---

## Task 6: End-to-end verificatie + deploy

- [ ] **Step 1: Volledige verificatie testplan uit spec**

Volg elk van de 8 stappen uit `docs/superpowers/specs/2026-04-24-catechismus-markers-return-design.md` (sectie "Testplan"), inclusief:
- Letter-markers visueel (Vraag 1)
- Antwoord zonder letters
- Preview met markers
- Popover open/sluiten
- End-to-end: Catechismus → popover → hoofdstuk → terug (scroll + expanded state)
- End-to-end: Preekvoorbereiding → bijbel → terug
- Hard refresh fallback
- Geen regressie op Hoofdstukken/Bladwijzers/AppSidebar

- [ ] **Step 2: Lint**

Run: `cd ~/projects/schriftinzicht/web && npm run lint`
Expected: geen nieuwe warnings/errors in gewijzigde files.

- [ ] **Step 3: Push naar master**

```bash
cd ~/projects/schriftinzicht
git push origin master
```

Dit triggert de auto-deploy workflow (`.github/workflows/deploy-ghpages.yml`, pad-trigger `web/**`).

- [ ] **Step 4: Verifieer productie-deploy**

Wacht ~2 minuten. Run:

```bash
gh run list --limit 1 --workflow=deploy-ghpages.yml
```

Expected: laatste run status `completed` / `success`.

Open: https://schriftinzicht.nl/catechismus
Doorloop korte smoke-test: letter-markers zichtbaar, popover werkt, terug-link functioneert.

---

## Afronding

Geen auto-workflow vereist buiten push-to-master (al geregeld). Geen DB migratie. Geen breaking changes voor bestaande features.
