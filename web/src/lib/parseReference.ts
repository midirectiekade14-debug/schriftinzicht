/**
 * Shared Bible reference parser for the entire app.
 * Handles both formal notation (Joh 3:16, Rom 8:28-30) and
 * natural Dutch language ("romeinen 8 vers 10 tot 15").
 */

export interface BibleRef {
  book: string;       // Canonical DB name (e.g. "Romeinen")
  chapter: number;
  verseStart: number;
  verseEnd: number;   // Same as verseStart for single verse
}

const BOOK_ALIASES: Record<string, string> = {
  gen: 'Genesis', genesis: 'Genesis',
  ex: 'Exodus', exodus: 'Exodus',
  lev: 'Leviticus', leviticus: 'Leviticus',
  num: 'Numeri', numeri: 'Numeri',
  deut: 'Deuteronomium', deuteronomium: 'Deuteronomium',
  joz: 'Jozua', jozua: 'Jozua',
  ri: 'Richteren', richt: 'Richteren', richteren: 'Richteren',
  ruth: 'Ruth',
  '1sam': '1 Samuël', '1samuel': '1 Samuël', '1samuël': '1 Samuël',
  '2sam': '2 Samuël', '2samuel': '2 Samuël', '2samuël': '2 Samuël',
  '1kon': '1 Koningen', '1koningen': '1 Koningen',
  '2kon': '2 Koningen', '2koningen': '2 Koningen',
  '1kron': '1 Kronieken', '1kronieken': '1 Kronieken',
  '2kron': '2 Kronieken', '2kronieken': '2 Kronieken',
  ezra: 'Ezra',
  neh: 'Nehemia', nehemia: 'Nehemia',
  est: 'Esther', esther: 'Esther',
  job: 'Job',
  ps: 'Psalmen', psalm: 'Psalmen', psalmen: 'Psalmen',
  spr: 'Spreuken', spreuken: 'Spreuken',
  pred: 'Prediker', prediker: 'Prediker',
  hoogl: 'Hooglied', hooglied: 'Hooglied',
  jes: 'Jesaja', jesaja: 'Jesaja',
  jer: 'Jeremia', jeremia: 'Jeremia',
  kla: 'Klaagliederen', klaagl: 'Klaagliederen', klaagliederen: 'Klaagliederen',
  ezech: 'Ezechiël', ez: 'Ezechiël', ezechiël: 'Ezechiël', ezechiel: 'Ezechiël',
  dan: 'Daniël', daniël: 'Daniël', daniel: 'Daniël',
  hos: 'Hosea', hosea: 'Hosea',
  joël: 'Joël', joel: 'Joël',
  am: 'Amos', amos: 'Amos',
  ob: 'Obadja', obadja: 'Obadja',
  jona: 'Jona',
  mi: 'Micha', micha: 'Micha',
  nah: 'Nahum', nahum: 'Nahum',
  hab: 'Habakuk', habakuk: 'Habakuk',
  zef: 'Zefanja', zefanja: 'Zefanja',
  hag: 'Haggaï', haggaï: 'Haggaï', haggai: 'Haggaï',
  zach: 'Zacharia', zacharia: 'Zacharia',
  mal: 'Maleachi', maleachi: 'Maleachi',
  mat: 'Mattheüs', matt: 'Mattheüs', mattheüs: 'Mattheüs', mattheus: 'Mattheüs', matthéüs: 'Mattheüs',
  mar: 'Marcus', mark: 'Marcus', markus: 'Marcus', marcus: 'Marcus',
  luc: 'Lucas', luk: 'Lucas', lukas: 'Lucas', lucas: 'Lucas',
  joh: 'Johannes', johannes: 'Johannes',
  hand: 'Handelingen der apostelen', handelingen: 'Handelingen der apostelen', 'handelingen der apostelen': 'Handelingen der apostelen',
  rom: 'Romeinen', romeinen: 'Romeinen',
  '1kor': '1 Korinthiërs', '1korinthe': '1 Korinthiërs', '1korinthiërs': '1 Korinthiërs',
  '2kor': '2 Korinthiërs', '2korinthe': '2 Korinthiërs', '2korinthiërs': '2 Korinthiërs',
  gal: 'Galaten', galaten: 'Galaten',
  ef: 'Efeziërs', efeze: 'Efeziërs', efeziërs: 'Efeziërs',
  fil: 'Filippenzen', filippenzen: 'Filippenzen',
  kol: 'Kolossenzen', kolossenzen: 'Kolossenzen',
  '1tes': '1 Thessalonicenzen', '1thess': '1 Thessalonicenzen', '1thessalonicenzen': '1 Thessalonicenzen',
  '2tes': '2 Thessalonicenzen', '2thess': '2 Thessalonicenzen', '2thessalonicenzen': '2 Thessalonicenzen',
  '1tim': '1 Timotheüs', '1timotheüs': '1 Timotheüs', '1timotheus': '1 Timotheüs',
  '2tim': '2 Timotheüs', '2timotheüs': '2 Timotheüs', '2timotheus': '2 Timotheüs',
  tit: 'Titus', titus: 'Titus',
  filem: 'Filemon', filemon: 'Filemon',
  hebr: 'Hebreeën', hebreeën: 'Hebreeën', hebreeen: 'Hebreeën',
  jak: 'Jakobus', jakobus: 'Jakobus',
  '1petr': '1 Petrus', '1petrus': '1 Petrus',
  '2petr': '2 Petrus', '2petrus': '2 Petrus',
  '1joh': '1 Johannes', '1johannes': '1 Johannes',
  '2joh': '2 Johannes', '2johannes': '2 Johannes',
  '3joh': '3 Johannes', '3johannes': '3 Johannes',
  jud: 'Judas', judas: 'Judas',
  openb: 'Openbaring van Johannes', openbaring: 'Openbaring van Johannes', opb: 'Openbaring van Johannes', 'openbaring van johannes': 'Openbaring van Johannes',
};

// Reverse lookup: full canonical name (lowercased) → canonical name
const BOOK_NAME_LOOKUP: Record<string, string> = {};
for (const canonical of Object.values(BOOK_ALIASES)) {
  BOOK_NAME_LOOKUP[canonical.toLowerCase()] = canonical;
}

function resolveBook(raw: string): string | null {
  const lower = raw.toLowerCase().trim();

  // Direct canonical match
  if (BOOK_NAME_LOOKUP[lower]) return BOOK_NAME_LOOKUP[lower];

  // Alias match (no spaces)
  const compressed = lower.replace(/\s+/g, '');
  if (BOOK_ALIASES[compressed]) return BOOK_ALIASES[compressed];

  // Alias match (with spaces)
  if (BOOK_ALIASES[lower]) return BOOK_ALIASES[lower];

  // Partial match: check if input starts with a known alias
  for (const [alias, name] of Object.entries(BOOK_ALIASES)) {
    if (alias.startsWith(lower) && lower.length >= 2) return name;
  }

  return null;
}

/**
 * Parse a Bible reference in many formats:
 *
 * Formal:
 *   "Joh 3:16"
 *   "Rom 8:28-30"
 *   "1 Kor 13:4-7"
 *   "Psalm 23:1"
 *
 * Natural Dutch:
 *   "romeinen 8 vers 10 tot 15"
 *   "genesis 1 vers 1"
 *   "psalm 23 vers 1 tot en met 6"
 *   "johannes 3 vers 16"
 *   "1 korinthe 13 vers 4 tot 7"
 *   "openbaring 21 vers 1-4"
 *   "hebreeën 11 vers 1"
 *   "psalmen 119 vers 105"
 *   "romeinen 8 10 tot 15"
 *   "joh 3 16"
 */
export function parseReference(input: string): BibleRef | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Normalize: collapse multiple spaces, lowercase for matching
  const normalized = trimmed.replace(/\s+/g, ' ');

  // ── PATTERN 1: Natural language with "vers" / "v" keyword ──
  // "romeinen 8 vers 10 tot 15"
  // "genesis 1 vers 1"
  // "1 korinthe 13 vers 4 tot en met 7"
  // "psalm 23 v 1-6"
  {
    const m = normalized.match(
      /^(.+?)\s+(\d+)\s+(?:vers|vs\.?|v\.?)\s*(\d+)(?:\s*(?:tot(?:\s+en\s+met)?|[-–]|t\/m)\s*(\d+))?$/i
    );
    if (m) {
      const book = resolveBook(m[1]);
      if (book) {
        const vs = parseInt(m[3], 10);
        return { book, chapter: parseInt(m[2], 10), verseStart: vs, verseEnd: m[4] ? parseInt(m[4], 10) : vs };
      }
    }
  }

  // ── PATTERN 2: Natural without "vers" keyword: "romeinen 8 10 tot 15" ──
  {
    const m = normalized.match(
      /^(.+?)\s+(\d+)\s+(\d+)\s+(?:tot(?:\s+en\s+met)?|t\/m)\s+(\d+)$/i
    );
    if (m) {
      const book = resolveBook(m[1]);
      if (book) {
        return { book, chapter: parseInt(m[2], 10), verseStart: parseInt(m[3], 10), verseEnd: parseInt(m[4], 10) };
      }
    }
  }

  // ── PATTERN 3: Formal with colon/dot/comma: "Rom 8:28-30" ──
  // Also handles multi-word book names: "1 Korinthe 13:4-7"
  // Also: "Handelingen der apostelen 2:1"
  {
    const m = normalized.match(
      /^(.+?)\s+(\d+)\s*[:.,]\s*(\d+)(?:\s*[-–]\s*(\d+))?$/i
    );
    if (m) {
      const book = resolveBook(m[1]);
      if (book) {
        const vs = parseInt(m[3], 10);
        return { book, chapter: parseInt(m[2], 10), verseStart: vs, verseEnd: m[4] ? parseInt(m[4], 10) : vs };
      }
    }
  }

  // ── PATTERN 4: Three bare numbers: "joh 3 16" or "psalm 23 1" ──
  {
    const m = normalized.match(
      /^(.+?)\s+(\d+)\s+(\d+)$/i
    );
    if (m) {
      const book = resolveBook(m[1]);
      if (book) {
        const vs = parseInt(m[3], 10);
        return { book, chapter: parseInt(m[2], 10), verseStart: vs, verseEnd: vs };
      }
    }
  }

  // ── PATTERN 5: Single-token book + chapter:verse (no space before chapter) ──
  // "Joh3:16" — edge case
  {
    const m = normalized.match(
      /^(\d?\s*[a-zA-ZëüïéàÀ]+)\.?\s*(\d+)\s*[:.,]\s*(\d+)(?:\s*[-–]\s*(\d+))?$/i
    );
    if (m) {
      const raw = m[1].replace(/\s+/g, '').toLowerCase();
      const book = BOOK_ALIASES[raw];
      if (book) {
        const vs = parseInt(m[3], 10);
        return { book, chapter: parseInt(m[2], 10), verseStart: vs, verseEnd: m[4] ? parseInt(m[4], 10) : vs };
      }
    }
  }

  // ── PATTERN 6: Book + chapter only: "Psalm 23", "Genesis 1", "Rom 8" ──
  // Returns verseStart=1, verseEnd=999 to fetch entire chapter
  {
    const m = normalized.match(
      /^(.+?)\s+(\d+)$/i
    );
    if (m) {
      const book = resolveBook(m[1]);
      if (book) {
        return { book, chapter: parseInt(m[2], 10), verseStart: 1, verseEnd: 999 };
      }
    }
  }

  return null;
}

/**
 * Display name for book — shortened where needed.
 * DB stores short names like "Handelingen" and "Openbaring".
 * Keep old long-form names mapped for backwards compatibility.
 */
const DISPLAY_NAMES: Record<string, string> = {
  // DB names are already short — keep for backwards compatibility with any old references
  'Handelingen der apostelen': 'Handelingen',
  'Openbaring van Johannes': 'Openbaring',
};

export function displayBookName(dbName: string): string {
  return DISPLAY_NAMES[dbName] || dbName;
}

/**
 * Replace abbreviated book references in running text with full display names.
 * E.g. "Rom. 3:19" → "Romeinen 3:19", "Ef. 3:17" → "Efeze 3:17"
 */
const INLINE_ABBREVS: [RegExp, string][] = [
  [/\bGenes?\.\s*(?=\d)/gi, 'Genesis '],
  [/\bGen\.\s*(?=\d)/gi, 'Genesis '],
  [/\bExod?\.\s*(?=\d)/gi, 'Exodus '],
  [/\bEx\.\s*(?=\d)/gi, 'Exodus '],
  [/\bLevit(?:icus)?\.?\s*(?=\d)/gi, 'Leviticus '],
  [/\bLev\.\s*(?=\d)/gi, 'Leviticus '],
  [/\bNum\.\s*(?=\d)/gi, 'Numeri '],
  [/\bNu\.\s*(?=\d)/gi, 'Numeri '],
  [/\bDeut(?:er)?\.\s*(?=\d)/gi, 'Deuteronomium '],
  [/\bDt\.\s*(?=\d)/gi, 'Deuteronomium '],
  [/\bJoz\.\s*(?=\d)/gi, 'Jozua '],
  [/\bRicht?\.\s*(?=\d)/gi, 'Richteren '],
  [/\bRi\.\s*(?=\d)/gi, 'Richteren '],
  [/\b1\s*Sam\.\s*(?=\d)/gi, '1 Samuël '],
  [/\b2\s*Sam\.\s*(?=\d)/gi, '2 Samuël '],
  [/\b1\s*Kon\.\s*(?=\d)/gi, '1 Koningen '],
  [/\b2\s*Kon\.\s*(?=\d)/gi, '2 Koningen '],
  [/\b1\s*Kron\.\s*(?=\d)/gi, '1 Kronieken '],
  [/\b2\s*Kron\.\s*(?=\d)/gi, '2 Kronieken '],
  [/\bNehem?\.\s*(?=\d)/gi, 'Nehemia '],
  [/\bEst\.\s*(?=\d)/gi, 'Esther '],
  [/\bPsalm?\.\s*(?=\d)/gi, 'Psalmen '],
  [/\bPs\.\s*(?=\d)/gi, 'Psalmen '],
  [/\bSpr\.\s*(?=\d)/gi, 'Spreuken '],
  [/\bPred\.\s*(?=\d)/gi, 'Prediker '],
  [/\bHoogl\.\s*(?=\d)/gi, 'Hooglied '],
  [/\bJesaj?\.\s*(?=\d)/gi, 'Jesaja '],
  [/\bJerem?\.\s*(?=\d)/gi, 'Jeremia '],
  [/\bKlaagl?\.\s*(?=\d)/gi, 'Klaagliederen '],
  [/\bEzech?\.\s*(?=\d)/gi, 'Ezechiël '],
  [/\bDan\.\s*(?=\d)/gi, 'Daniël '],
  [/\bHos\.\s*(?=\d)/gi, 'Hosea '],
  [/\bJoël\.\s*(?=\d)/gi, 'Joël '],
  [/\bAm\.\s*(?=\d)/gi, 'Amos '],
  [/\bObadj?\.\s*(?=\d)/gi, 'Obadja '],
  [/\bMicha?\.\s*(?=\d)/gi, 'Micha '],
  [/\bMi\.\s*(?=\d)/gi, 'Micha '],
  [/\bNah\.\s*(?=\d)/gi, 'Nahum '],
  [/\bHabak?\.\s*(?=\d)/gi, 'Habakuk '],
  [/\bZefan?\.\s*(?=\d)/gi, 'Zefanja '],
  [/\bHagg?\.\s*(?=\d)/gi, 'Haggaï '],
  [/\bZachar?\.\s*(?=\d)/gi, 'Zacharia '],
  [/\bZach\.\s*(?=\d)/gi, 'Zacharia '],
  [/\bMalach?\.\s*(?=\d)/gi, 'Maleachi '],
  [/\bMal\.\s*(?=\d)/gi, 'Maleachi '],
  [/\bMatth?\.\s*(?=\d)/gi, 'Mattheüs '],
  [/\bMark?\.\s*(?=\d)/gi, 'Markus '],
  [/\bLuk?\.\s*(?=\d)/gi, 'Lukas '],
  [/\bJoh\.\s*(?=\d)/gi, 'Johannes '],
  [/\bHand\.\s*(?=\d)/gi, 'Handelingen '],
  [/\bRom\.\s*(?=\d)/gi, 'Romeinen '],
  [/\b1\s*Kor(?:inth(?:e|iërs)?)?\.\s*(?=\d)/gi, '1 Korinthe '],
  [/\b2\s*Kor(?:inth(?:e|iërs)?)?\.\s*(?=\d)/gi, '2 Korinthe '],
  [/\bGalat?\.\s*(?=\d)/gi, 'Galaten '],
  [/\bGal\.\s*(?=\d)/gi, 'Galaten '],
  [/\bEfeze?\.\s*(?=\d)/gi, 'Efeze '],
  [/\bEf\.\s*(?=\d)/gi, 'Efeze '],
  [/\bFilipp?\.\s*(?=\d)/gi, 'Filippenzen '],
  [/\bFil\.\s*(?=\d)/gi, 'Filippenzen '],
  [/\bKol(?:oss)?\.\s*(?=\d)/gi, 'Kolossenzen '],
  [/\b1\s*Thess?\.\s*(?=\d)/gi, '1 Thessalonicenzen '],
  [/\b2\s*Thess?\.\s*(?=\d)/gi, '2 Thessalonicenzen '],
  [/\b1\s*Tim(?:oth)?\.\s*(?=\d)/gi, '1 Timotheüs '],
  [/\b2\s*Tim(?:oth)?\.\s*(?=\d)/gi, '2 Timotheüs '],
  [/\bTit\.\s*(?=\d)/gi, 'Titus '],
  [/\bFilem\.\s*(?=\d)/gi, 'Filemon '],
  [/\bHebr?\.\s*(?=\d)/gi, 'Hebreeën '],
  [/\bJakob?\.\s*(?=\d)/gi, 'Jakobus '],
  [/\bJak\.\s*(?=\d)/gi, 'Jakobus '],
  [/\b1\s*Petr?\.\s*(?=\d)/gi, '1 Petrus '],
  [/\b2\s*Petr?\.\s*(?=\d)/gi, '2 Petrus '],
  [/\b1\s*Joh\.\s*(?=\d)/gi, '1 Johannes '],
  [/\b2\s*Joh\.\s*(?=\d)/gi, '2 Johannes '],
  [/\b3\s*Joh\.\s*(?=\d)/gi, '3 Johannes '],
  [/\bJud\.\s*(?=\d)/gi, 'Judas '],
  [/\bOpenb?\.\s*(?=\d)/gi, 'Openbaring '],
];

export function expandInlineRefs(text: string): string {
  let result = text;
  for (const [pattern, replacement] of INLINE_ABBREVS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

/**
 * Strip navigational/import residue that leaked in from source HTML (scraped OCR PDFs, Calvijn
 * site-map fragments, etc.): "Return to top of page", link emoji, stray "Pagina X van Y" markers.
 */
export function sanitizeContent(text: string): string {
  if (!text) return '';
  return text
    .replace(/\uD83D\uDD17\uFE0F?/g, '')
    .replace(/Return\s+to\s+top\s+of\s+page\s*/gi, '')
    .replace(/Back\s+to\s+top\s*/gi, '')
    .replace(/Top\s+of\s+page\s*/gi, '')
    .replace(/(^|\s)Pagina\s+\d+\s+van\s+\d+\s*/gmi, '$1')
    .replace(/\(\s*\n\s*([^()\n]{1,60}?)\s*\n/g, '($1)\n')
    .replace(/([\u0590-\u05FF\u0370-\u03FF])([A-Za-z])/g, '$1 $2')
    .replace(/([A-Za-z])([\u0590-\u05FF\u0370-\u03FF])/g, '$1 $2')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Format a BibleRef back to a display string.
 */
export function formatRef(ref: BibleRef): string {
  // Whole-chapter reference (verseEnd=999 is sentinel for "all verses")
  if (ref.verseStart === 1 && ref.verseEnd >= 999) {
    return `${displayBookName(ref.book)} ${ref.chapter}`;
  }
  const range = ref.verseEnd > ref.verseStart
    ? `${ref.verseStart}\u2013${ref.verseEnd}`
    : `${ref.verseStart}`;
  return `${displayBookName(ref.book)} ${ref.chapter}:${range}`;
}

// ── Autocomplete suggestions ──

// Unique canonical book names in Bible order
const BOOK_ORDER = [
  'Genesis', 'Exodus', 'Leviticus', 'Numeri', 'Deuteronomium',
  'Jozua', 'Richteren', 'Ruth', '1 Samuël', '2 Samuël',
  '1 Koningen', '2 Koningen', '1 Kronieken', '2 Kronieken',
  'Ezra', 'Nehemia', 'Esther', 'Job', 'Psalmen',
  'Spreuken', 'Prediker', 'Hooglied', 'Jesaja', 'Jeremia',
  'Klaagliederen', 'Ezechiël', 'Daniël', 'Hosea', 'Joël',
  'Amos', 'Obadja', 'Jona', 'Micha', 'Nahum',
  'Habakuk', 'Zefanja', 'Haggaï', 'Zacharia', 'Maleachi',
  'Mattheüs', 'Markus', 'Lukas', 'Johannes',
  'Handelingen', 'Romeinen',
  '1 Korinthe', '2 Korinthe', 'Galaten', 'Efeze',
  'Filippenzen', 'Kolossenzen', '1 Thessalonicenzen', '2 Thessalonicenzen',
  '1 Timotheüs', '2 Timotheüs', 'Titus', 'Filemon',
  'Hebreeën', 'Jakobus', '1 Petrus', '2 Petrus',
  '1 Johannes', '2 Johannes', '3 Johannes', 'Judas',
  'Openbaring',
];

/**
 * Get autocomplete suggestions for partial input.
 * Returns up to `limit` book name suggestions that match the input prefix.
 */
export function getSuggestions(input: string, limit = 6): string[] {
  const lower = input.trim().toLowerCase();
  if (lower.length < 1) return [];

  // If input already looks like a complete reference (has numbers after book), no suggestions
  if (/\d+\s*[:.,]\s*\d+/.test(input)) return [];
  if (/\s+\d+\s+(?:vers|v)\s/i.test(input)) return [];

  const results: string[] = [];

  // Match canonical names
  for (const name of BOOK_ORDER) {
    if (name.toLowerCase().startsWith(lower)) {
      results.push(name);
      if (results.length >= limit) break;
    }
  }

  // Also match aliases if not enough results
  if (results.length < limit) {
    for (const [alias, canonical] of Object.entries(BOOK_ALIASES)) {
      if (alias.startsWith(lower) && !results.includes(canonical)) {
        results.push(canonical);
        if (results.length >= limit) break;
      }
    }
  }

  return results;
}

/**
 * Navigate to adjacent verse(s). Returns a new query string.
 */
export function navigateRef(ref: BibleRef, direction: 'prev' | 'next'): string {
  const rangeSize = ref.verseEnd - ref.verseStart + 1;
  if (direction === 'prev') {
    const newEnd = ref.verseStart - 1;
    const newStart = Math.max(1, newEnd - rangeSize + 1);
    if (newEnd < 1) {
      // Go to previous chapter
      const prevCh = ref.chapter - 1;
      if (prevCh < 1) return formatRef(ref); // Can't go back further
      return `${ref.book} ${prevCh}:999`; // Will clamp to last verse
    }
    return `${ref.book} ${ref.chapter}:${newStart}${newStart !== newEnd ? '-' + newEnd : ''}`;
  } else {
    const newStart = ref.verseEnd + 1;
    const newEnd = newStart + rangeSize - 1;
    return `${ref.book} ${ref.chapter}:${newStart}${newStart !== newEnd ? '-' + newEnd : ''}`;
  }
}
