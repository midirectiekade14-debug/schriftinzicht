# Catechismus: letter-markers & terug-navigatie

**Status:** approved design (brainstorm fase)
**Datum:** 2026-04-24
**Scope:** `/catechismus` + `/preekvoorbereiding` + `/bijbel/:book/:ch`

## Probleem

1. Op `/catechismus` staan in de antwoorden bare letters (`a`, `b`, `c`, ...) die verwijzen naar bewijsteksten, maar ze zien er uit als losse letters in de lopende tekst. De bestaande `formatAnswer()` splitst op `a) ` — patroon dat in de data niet voorkomt — dus de functie heeft geen effect.
2. Wanneer een gebruiker op een bewijstekst klikt, wordt hij naar `/bijbel/:book/:ch` gestuurd en raakt zijn plek in de catechismus kwijt. Hetzelfde geldt voor vers-links op `/preekvoorbereiding`.

## Bevindingen onderzoek

- `catechism_proof_texts` heeft kolommen `id, question_id, verse_id, note`. Geen `marker`/`sort_order` kolom. We kunnen proof-rijen dus niet programmatisch koppelen aan specifieke letters.
- Aantal letters ≠ aantal proofs. Vraag 1: 10 letters, 24 proofs. Vraag 54: 9 letters, 26 proofs. Elke letter groepeert meerdere verzen — die groepering is in de data niet aanwezig.
- `VersePopup.tsx` bestaat al en wordt in `Preek.tsx` gebruikt voor een popover met vers + "Open hoofdstuk" link.
- `Zoeken.tsx` navigeert niet naar `/bijbel/:book/:ch`; alle vers-content wordt inline op de zoekpagina getoond. Buiten scope.
- `Verzen.tsx` heeft een hardcoded back-link die altijd naar de hoofdstukkenlijst van het boek gaat.

## Ontwerp

### Onderdeel 1 — Letter-markers in antwoord (visueel)

Vervang `formatAnswer()` door een parser die sequentieel letters `a, b, c, ...` in de tekst vindt en als superscript-badge rendert.

**Parser-algoritme:**

```
letters = [a, b, c, ..., z]
pos = 0
output = []
for L in letters:
  regex = new RegExp(`(?<=[\\s,;:.])${L}(?=[\\s,;:.])`)
  match = text.slice(pos).search(regex)
  if match === -1: break
  output.push(text.slice(pos, pos + match))
  output.push(<sup class="cat-marker" key={L}>{L}</sup>)
  pos = pos + match + 1
output.push(text.slice(pos))
```

Sequentieel zoeken voorkomt false-positives: als letter `a` per ongeluk op een woord-grens staat (bv. leenwoord), wordt de eerste match alsnog als marker gezien. Maar `b`, `c`, `d` zijn in het Nederlands geen staande woorden, dus de kans op drift is nul.

**Rendering in preview.** `formatAnswer()` wordt ook op de getrunceerde preview (150 char) toegepast. Truncation kan midden in een letter vallen — dan mist die letter in de preview, geen probleem.

**Antwoorden zonder letters** leveren een enkele plain-string output — identieke weergave als voorheen.

**Files:**
- `src/pages/Catechismus.tsx` — `formatAnswer()` herschreven, gebruikt in `{formatAnswer(answer)}` èn `{formatAnswer(preview)}`.
- `src/index.css` — nieuwe class `.cat-marker` (styling geïnspireerd op `.kant-marker`).

### Onderdeel 2 — Bewijstekst → popover

Vervang `<Link>` in de `cat-proofs-list` door een `<button>` die `VersePopup` opent.

**Integratie:**

```tsx
const [versePopup, setVersePopup] = useState<{
  book: string;
  chapter: number;
  verseStart: number;
  rect: DOMRect;
  questionId: string; // nodig voor returnState
} | null>(null);
```

Klikken op de knop leest `getBoundingClientRect()` en zet popup-state. De rendered `<VersePopup>` krijgt een nieuwe optionele prop `returnState` (zie Onderdeel 3) die wordt doorgezet op de interne "Open hoofdstuk" Link.

**Accessibility.** `<button type="button" className="cat-proof-ref">` — Enter/Space werken native. `VersePopup` sluit al op outside-click en Escape.

**Edge case.** Als VersePopup het vers niet kan vinden (ontbrekend boek), toont hij "Tekst niet gevonden" en géén "Open hoofdstuk" knop — bestaand gedrag.

**Files:**
- `src/components/VersePopup.tsx` — nieuwe optionele prop `returnState?: unknown` doorgegeven aan interne `<Link state={...} />`.
- `src/pages/Catechismus.tsx` — Link → button + popup state + VersePopup render.

### Onderdeel 3 — Terug-navigatie

**State-pattern.** Bron-pagina zet op de `<Link>` (of via `navigate()`) een state-object:

```ts
type ReturnState = {
  returnTo: string;        // pathname + search
  returnLabel: string;     // "Catechismus (Vraag 7)" | "Preekvoorbereiding"
  returnScrollY: number;
  returnExpandedId?: string; // Catechismus: expanded question id
};
```

**Doel-pagina `Verzen.tsx`** leest `location.state` en toont dynamische back-link:

```tsx
const returnState = location.state as ReturnState | null;

{returnState?.returnTo ? (
  <button
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
  <Link to={`/bijbel/${bookId}?...`} className="back-link">&lsaquo; {bookName}</Link>
)}
```

**Bron-pagina useEffect** leest terugkeer-state en herstelt positie:

```tsx
useEffect(() => {
  const restore = location.state as { restoreScrollY?: number; restoreExpandedId?: string } | null;
  if (!restore || loading) return;

  if (restore.restoreExpandedId) {
    setExpanded(prev => ({ ...prev, [restore.restoreExpandedId!]: true }));
  }
  if (typeof restore.restoreScrollY === 'number') {
    // Wait a tick so DOM is updated with expanded question before scrolling
    requestAnimationFrame(() => window.scrollTo(0, restore.restoreScrollY!));
  }

  // Scrub state zodat refresh of verder-navigeren de state niet hergebruikt
  navigate(location.pathname + location.search, { replace: true, state: null });
}, [loading]);
```

**Scope-concretisering:**

| Bron | Link | Nieuwe state |
|------|------|-------------|
| Catechismus (via VersePopup "Open hoofdstuk") | 1× in VersePopup | `{ returnTo: '/catechismus', returnLabel: 'Catechismus (Vraag N)', returnScrollY, returnExpandedId }` |
| Preekvoorbereiding | 2× (`:587`, `:681`) | `{ returnTo: '/preekvoorbereiding?q=...', returnLabel: 'Preekvoorbereiding', returnScrollY }` |

**Edge cases:**
- Refresh op `/bijbel/...` verliest `location.state` → back-link valt terug op huidig gedrag (boek-hoofdstukkenlijst). Geen sessionStorage-fallback.
- Gebruiker opent popover, sluit zonder doorklikken → geen navigatie, geen state-overdracht.
- Browser-back knop van de gebruiker werkt onafhankelijk en blijft intact (React Router history).

**Files:**
- `src/pages/Verzen.tsx` — dynamische back-link (3 plekken: loader, error, normal render — zie huidige code regels 298-322).
- `src/pages/Catechismus.tsx` — set returnState in popover, useEffect voor restore.
- `src/pages/Preekvoorbereiding.tsx` — state op Links regel 587, 681; useEffect voor scroll-restore.
- `src/components/VersePopup.tsx` — `returnState` prop doorgegeven aan interne Link.

## Niet-doelen

- Geen DB-schema wijziging. `catechism_proof_texts.marker` toevoegen + backfill is een separate toekomstige iteratie.
- Geen klikbare letter-to-proof mapping. Letters zijn alleen visueel.
- Zoeken krijgt geen back-navigation — navigeert niet naar `/bijbel/:book/:ch`.
- Bladwijzers/AppSidebar krijgen geen state — dit zijn navigatie-entry-points, geen terugkeer-bron.
- Geen expanded-state herstel voor `/preekvoorbereiding` commentaries/sermons — query in URL herlaadt de data; scroll is voldoende.

## Testplan

1. **Letter-markers visueel** — bezoek `/catechismus`, klap Vraag 1 open, controleer dat a–j als superscript-badges verschijnen in de tekst.
2. **Antwoord zonder letters** — zoek een vraag zonder markers (korte antwoorden), controleer dat tekst ongewijzigd wordt weergegeven.
3. **Preview met markers** — dichtgeklapte vraag toont preview-tekst; als markers voor char 150 vallen worden ze getoond.
4. **Popover** — klik op een bewijstekst-knop, popover verschijnt met vers. Escape sluit.
5. **Open hoofdstuk vanaf popover** — klik "Open hoofdstuk", land op `/bijbel/:book/:ch`, back-link zegt *"← Terug naar Catechismus (Vraag N)"*. Klik back-link → terug op catechismus, vraag blijft open, scroll-positie hersteld.
6. **Preekvoorbereiding → bijbel → terug** — op `/preekvoorbereiding?q=Rom+8:28` klik een vers-link, land op `/bijbel/...`, back-link zegt *"← Terug naar Preekvoorbereiding"*, klik → terug op preekvoorbereiding, zelfde query, scroll-positie hersteld.
7. **Hard refresh** — refresh op `/bijbel/...` na popover-navigatie, back-link valt terug op boek-hoofdstukkenlijst.
8. **Geen regressie** — andere ingangen naar `/bijbel/:book/:ch` (Bladwijzers, AppSidebar, Hoofdstukken-list) tonen de normale boek-back-link.

## Impact

- **Gebruikerswaarde (hoog):** letters krijgen betekenis (direct zichtbaar als referentie-markers); bewijstekst-check geeft geen context-verlies meer.
- **Technisch risico (laag):** geen DB-wijziging, geen nieuwe afhankelijkheden, `VersePopup` is al getest in productie (`Preek.tsx`).
- **Wijziging oppervlak:** 5 files.

## Uitrol

Normale deploy via master → Actions workflow → GitHub Pages (zie `project_schriftinzicht_web_plan.md`). Geen DB migratie. `web/**` pad-trigger pakt de wijzigingen automatisch.
