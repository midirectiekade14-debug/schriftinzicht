/**
 * 365-daags Bijbelleesplan
 *
 * Elke dag bevat 2-3 OT-hoofdstukken + 1 NT-hoofdstuk (3-4 totaal).
 * Alle 1189 hoofdstukken van de Bijbel worden doorlopen in canonieke volgorde.
 * Boekennamen in het Nederlands, boek-ID's volgen de standaard protestantse ordening.
 */

export interface ChapterReading {
  book: string;
  bookId: number;
  chapter: number;
}

export interface DayPlan {
  day: number;
  readings: ChapterReading[];
}

interface BookDef {
  name: string;
  id: number;
  chapters: number;
}

// -- Oude Testament (39 boeken, 929 hoofdstukken) --

const otBooks: BookDef[] = [
  { name: 'Genesis', id: 1, chapters: 50 },
  { name: 'Exodus', id: 2, chapters: 40 },
  { name: 'Leviticus', id: 3, chapters: 27 },
  { name: 'Numeri', id: 4, chapters: 36 },
  { name: 'Deuteronomium', id: 5, chapters: 34 },
  { name: 'Jozua', id: 6, chapters: 24 },
  { name: 'Richteren', id: 7, chapters: 21 },
  { name: 'Ruth', id: 8, chapters: 4 },
  { name: '1 Samuël', id: 9, chapters: 31 },
  { name: '2 Samuël', id: 10, chapters: 24 },
  { name: '1 Koningen', id: 11, chapters: 22 },
  { name: '2 Koningen', id: 12, chapters: 25 },
  { name: '1 Kronieken', id: 13, chapters: 29 },
  { name: '2 Kronieken', id: 14, chapters: 36 },
  { name: 'Ezra', id: 15, chapters: 10 },
  { name: 'Nehemia', id: 16, chapters: 13 },
  { name: 'Esther', id: 17, chapters: 10 },
  { name: 'Job', id: 18, chapters: 42 },
  { name: 'Psalmen', id: 19, chapters: 150 },
  { name: 'Spreuken', id: 20, chapters: 31 },
  { name: 'Prediker', id: 21, chapters: 12 },
  { name: 'Hooglied', id: 22, chapters: 8 },
  { name: 'Jesaja', id: 23, chapters: 66 },
  { name: 'Jeremia', id: 24, chapters: 52 },
  { name: 'Klaagliederen', id: 25, chapters: 5 },
  { name: 'Ezechiël', id: 26, chapters: 48 },
  { name: 'Daniël', id: 27, chapters: 12 },
  { name: 'Hosea', id: 28, chapters: 14 },
  { name: 'Joël', id: 29, chapters: 3 },
  { name: 'Amos', id: 30, chapters: 9 },
  { name: 'Obadja', id: 31, chapters: 1 },
  { name: 'Jona', id: 32, chapters: 4 },
  { name: 'Micha', id: 33, chapters: 7 },
  { name: 'Nahum', id: 34, chapters: 3 },
  { name: 'Habakuk', id: 35, chapters: 3 },
  { name: 'Zefanja', id: 36, chapters: 3 },
  { name: 'Haggaï', id: 37, chapters: 2 },
  { name: 'Zacharia', id: 38, chapters: 14 },
  { name: 'Maleachi', id: 39, chapters: 4 },
];

// -- Nieuwe Testament (27 boeken, 260 hoofdstukken) --

const ntBooks: BookDef[] = [
  { name: 'Mattheüs', id: 40, chapters: 28 },
  { name: 'Markus', id: 41, chapters: 16 },
  { name: 'Lukas', id: 42, chapters: 24 },
  { name: 'Johannes', id: 43, chapters: 21 },
  { name: 'Handelingen', id: 44, chapters: 28 },
  { name: 'Romeinen', id: 45, chapters: 16 },
  { name: '1 Korinthe', id: 46, chapters: 16 },
  { name: '2 Korinthe', id: 47, chapters: 13 },
  { name: 'Galaten', id: 48, chapters: 6 },
  { name: 'Efeze', id: 49, chapters: 6 },
  { name: 'Filippenzen', id: 50, chapters: 4 },
  { name: 'Kolossenzen', id: 51, chapters: 4 },
  { name: '1 Thessalonicenzen', id: 52, chapters: 5 },
  { name: '2 Thessalonicenzen', id: 53, chapters: 3 },
  { name: '1 Timotheüs', id: 54, chapters: 6 },
  { name: '2 Timotheüs', id: 55, chapters: 4 },
  { name: 'Titus', id: 56, chapters: 3 },
  { name: 'Filemon', id: 57, chapters: 1 },
  { name: 'Hebreeën', id: 58, chapters: 13 },
  { name: 'Jakobus', id: 59, chapters: 5 },
  { name: '1 Petrus', id: 60, chapters: 5 },
  { name: '2 Petrus', id: 61, chapters: 3 },
  { name: '1 Johannes', id: 62, chapters: 5 },
  { name: '2 Johannes', id: 63, chapters: 1 },
  { name: '3 Johannes', id: 64, chapters: 1 },
  { name: 'Judas', id: 65, chapters: 1 },
  { name: 'Openbaring', id: 66, chapters: 22 },
];

// -- Flatten books into individual chapter readings --

function flattenBooks(books: BookDef[]): ChapterReading[] {
  const chapters: ChapterReading[] = [];
  for (const book of books) {
    for (let ch = 1; ch <= book.chapters; ch++) {
      chapters.push({ book: book.name, bookId: book.id, chapter: ch });
    }
  }
  return chapters;
}

// -- Distribute chapters evenly across 365 days --
// Uses Bresenham-style distribution so chapters spread evenly without clustering.

function distribute(chapters: ChapterReading[], days: number): ChapterReading[][] {
  const total = chapters.length;
  const result: ChapterReading[][] = Array.from({ length: days }, () => []);

  // Each day gets at least floor(total/days) chapters.
  // The remainder days get one extra chapter.
  const base = Math.floor(total / days);
  const remainder = total - base * days;

  let idx = 0;
  for (let d = 0; d < days; d++) {
    // Spread the "extra" days evenly using integer division check
    const count = d < remainder ? base + 1 : base;
    for (let i = 0; i < count; i++) {
      result[d].push(chapters[idx++]);
    }
  }

  return result;
}

// -- Build the plan --

function buildPlan(): DayPlan[] {
  const otChapters = flattenBooks(otBooks); // 929
  const ntChapters = flattenBooks(ntBooks); // 260

  const DAYS = 365;
  const otPerDay = distribute(otChapters, DAYS);
  const ntPerDay = distribute(ntChapters, DAYS);

  // NT has 260 chapters for 365 days → 260 days get 1 chapter, 105 days get 0.
  // Cycle through NT a second time to fill the gaps so every day has NT reading.
  // We append from the start of NT again for the 105 "empty" days.
  let ntFillIdx = 0;
  for (let d = 0; d < DAYS; d++) {
    if (ntPerDay[d].length === 0) {
      ntPerDay[d].push(ntChapters[ntFillIdx % ntChapters.length]);
      ntFillIdx++;
    }
  }

  const plan: DayPlan[] = [];
  for (let d = 0; d < DAYS; d++) {
    plan.push({
      day: d + 1,
      readings: [...otPerDay[d], ...ntPerDay[d]],
    });
  }

  return plan;
}

/** Complete 365-day Bible reading plan. OT + NT, Dutch book names. */
export const readingPlan: DayPlan[] = buildPlan();
