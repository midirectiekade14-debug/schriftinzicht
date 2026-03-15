import { useState, useCallback, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { BibleVerse, Commentary, Kanttekening } from '../types/database';

interface CrossRefRow {
  id: string;
  votes: number;
  to_verse_end_id: string | null;
  to_verse: { id: string; book_id: string; chapter: number; verse: number; text_sv: string; bible_books: { name: string; abbreviation: string } };
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
  hand: 'Handelingen der apostelen', handelingen: 'Handelingen der apostelen',
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
  openb: 'Openbaring van Johannes', openbaring: 'Openbaring van Johannes', opb: 'Openbaring van Johannes',
};

// Build a reverse lookup: lowercase DB name → canonical DB name
const BOOK_NAME_LOOKUP: Record<string, string> = {};
for (const canonical of Object.values(BOOK_ALIASES)) {
  BOOK_NAME_LOOKUP[canonical.toLowerCase()] = canonical;
}

function parseReference(input: string): { book: string; chapter: number; verse: number } | null {
  const trimmed = input.trim();

  // First try: multi-word book names (e.g. "Handelingen der apostelen 2:1")
  const multiMatch = trimmed.match(
    /^(.+?)\s+(\d+)\s*[:.,]\s*(\d+)(?:\s*[-–]\s*\d+)?$/i
  );
  if (multiMatch) {
    const rawMulti = multiMatch[1].trim().toLowerCase();
    if (BOOK_NAME_LOOKUP[rawMulti]) {
      return {
        book: BOOK_NAME_LOOKUP[rawMulti],
        chapter: parseInt(multiMatch[2], 10),
        verse: parseInt(multiMatch[3], 10),
      };
    }
    const compressed = rawMulti.replace(/\s+/g, '');
    if (BOOK_ALIASES[compressed]) {
      return {
        book: BOOK_ALIASES[compressed],
        chapter: parseInt(multiMatch[2], 10),
        verse: parseInt(multiMatch[3], 10),
      };
    }
    if (BOOK_ALIASES[rawMulti]) {
      return {
        book: BOOK_ALIASES[rawMulti],
        chapter: parseInt(multiMatch[2], 10),
        verse: parseInt(multiMatch[3], 10),
      };
    }
  }

  // Second try: original single-token regex (fallback)
  const match = trimmed.match(
    /^(\d?\s*[a-zA-Zëüïéà]+)\.?\s*(\d+)\s*[:.,]\s*(\d+)(?:\s*[-–]\s*\d+)?$/i
  );
  if (!match) return null;

  const rawBook = match[1].replace(/\s+/g, '').toLowerCase();
  const chapter = parseInt(match[2], 10);
  const verse = parseInt(match[3], 10);

  const bookName = BOOK_ALIASES[rawBook];
  if (!bookName) return null;

  return { book: bookName, chapter, verse };
}

interface CommentaryWithAuthor extends Omit<Commentary, 'authors'> {
  authors: { name: string; born_year: number | null; died_year: number | null; era: string | null };
}

export default function Zoeken() {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [verse, setVerse] = useState<BibleVerse | null>(null);
  const [commentaries, setCommentaries] = useState<CommentaryWithAuthor[]>([]);
  const [kanttekeningen, setKanttekeningen] = useState<Kanttekening[]>([]);
  const [crossRefs, setCrossRefs] = useState<CrossRefRow[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const prefill = searchParams.get('q');
    if (prefill && prefill !== query) {
      setQuery(prefill);
    }
  }, [searchParams]);

  useEffect(() => {
    const prefill = searchParams.get('q');
    if (prefill && query === prefill && query) {
      search();
    }
  }, [query, searchParams]);

  const search = useCallback(async () => {
    const ref = parseReference(query);
    if (!ref) {
      setError('Voer een geldige referentie in, bijv. "Joh 3:16" of "Psalm 23:1"');
      setVerse(null);
      setCommentaries([]);
      setKanttekeningen([]);
      setCrossRefs([]);
      return;
    }

    setLoading(true);
    setError(null);
    setExpanded({});

    try {
      const { data: books } = await supabase
        .from('bible_books')
        .select('id')
        .eq('name', ref.book)
        .limit(1);

      if (!books?.length) {
        setError(`Boek "${ref.book}" niet gevonden.`);
        setVerse(null);
        setCommentaries([]);
        setKanttekeningen([]);
        setCrossRefs([]);
        setLoading(false);
        return;
      }

      const bookId = books[0].id;

      const { data: verses } = await supabase
        .from('bible_verses')
        .select('*, bible_books(name, abbreviation)')
        .eq('book_id', bookId)
        .eq('chapter', ref.chapter)
        .eq('verse', ref.verse)
        .limit(1);

      if (!verses?.length) {
        setError(`${ref.book} ${ref.chapter}:${ref.verse} niet gevonden.`);
        setVerse(null);
        setCommentaries([]);
        setKanttekeningen([]);
        setCrossRefs([]);
        setLoading(false);
        return;
      }

      setVerse(verses[0] as BibleVerse);

      const [commRes, kantRes, crossRes] = await Promise.all([
        supabase
          .from('commentaries')
          .select('*, authors(name, born_year, died_year, era)')
          .eq('verse_id', verses[0].id)
          .order('year_written', { ascending: true }),
        supabase
          .from('kanttekeningen')
          .select('*')
          .eq('verse_id', verses[0].id)
          .order('note_order', { ascending: true }),
        supabase
          .from('cross_references')
          .select('id, votes, to_verse_end_id, to_verse:bible_verses!to_verse_id(id, book_id, chapter, verse, text_sv, bible_books(name, abbreviation))')
          .eq('from_verse_id', verses[0].id)
          .order('votes', { ascending: false })
          .limit(15),
      ]);

      setCommentaries((commRes.data || []) as CommentaryWithAuthor[]);
      setKanttekeningen(kantRes.data || []);
      setCrossRefs((crossRes.data || []) as unknown as CrossRefRow[]);
    } catch {
      setError('Fout bij het zoeken. Controleer je internetverbinding.');
    } finally {
      setLoading(false);
    }
  }, [query]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') search();
  };

  return (
    <>
      <div className="screen-header">
        <h1>Zoeken</h1>
      </div>
      <div className="page">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Bijbelreferentie, bijv. Joh 3:16"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            autoCorrect="off"
          />
          <button onClick={search}>Zoek</button>
        </div>

        {loading && (
          <div className="loader"><div className="spinner" /></div>
        )}

        {error && (
          <div className="error-box">{error}</div>
        )}

        {verse && (
          <div className="verse-card">
            <div className="verse-ref">
              {(verse.bible_books as any)?.name} {verse.chapter}:{verse.verse}
            </div>
            <div className="verse-text">{verse.text_sv}</div>
          </div>
        )}

        {verse && !loading && kanttekeningen.length > 0 && (
          <div className="detail-section" style={{ marginBottom: 'var(--sp-md)' }}>
            <div className="section-title">Kanttekeningen ({kanttekeningen.length})</div>
            {kanttekeningen.map((k) => (
              <div key={k.id} className="kanttekening-item">
                {k.marker && <span className="kant-marker">{k.marker}</span>}
                <span className="kant-text">{k.note_text}</span>
              </div>
            ))}
          </div>
        )}

        {verse && !loading && (
          <div>
            <div className="section-title">
              Verklaringen ({commentaries.length})
            </div>
            {commentaries.length === 0 ? (
              <div className="empty-text">
                Geen verklaringen gevonden voor dit vers.
              </div>
            ) : (
              commentaries.map((item) => {
                const isExpanded = expanded[item.id];
                const text = item.commentary_text || '';
                const preview = text.length > 200 ? text.slice(0, 200) + '...' : text;
                const authorName = item.authors?.name || 'Onbekend';
                const years = item.authors?.born_year
                  ? `${item.authors.born_year}\u2013${item.authors.died_year || '?'}`
                  : '';

                return (
                  <div
                    key={item.id}
                    className="commentary-card"
                    onClick={() => toggleExpand(item.id)}
                  >
                    <div className="commentary-header">
                      <span className="author-name">{authorName}</span>
                      {years && <span className="author-years">{years}</span>}
                      {item.year_written && (
                        <span className="year-badge">{item.year_written}</span>
                      )}
                    </div>
                    <div className="commentary-text">
                      {isExpanded ? text : preview}
                    </div>
                    {text.length > 200 && (
                      <div className="expand-hint">
                        {isExpanded ? 'Inklappen \u25B2' : 'Lees meer \u25BC'}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {verse && !loading && crossRefs.length > 0 && (
          <div style={{ marginBottom: 'var(--sp-md)' }}>
            <div className="section-title">Kruisverwijzingen ({crossRefs.length})</div>
            <div className="cross-refs-list">
              {crossRefs.map((cr) => {
                const tv = cr.to_verse;
                if (!tv) return null;
                const book = tv.bible_books;
                const identifier = book?.abbreviation || book?.name || '';
                const ref = `${book?.name ?? ''} ${tv.chapter}:${tv.verse}`;
                const preview = tv.text_sv.length > 120 ? tv.text_sv.slice(0, 120) + '\u2026' : tv.text_sv;
                return (
                  <Link
                    key={cr.id}
                    to={`/zoeken?q=${encodeURIComponent(`${identifier} ${tv.chapter}:${tv.verse}`)}`}
                    className="cross-ref-item"
                  >
                    <span className="cross-ref-ref">{ref}</span>
                    <span className="cross-ref-preview">{preview}</span>
                    <span className="cross-ref-votes">{cr.votes}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {!verse && !loading && !error && (
          <div className="welcome">
            <h1>SchriftInzicht</h1>
            <p>Ontdek bijbelverklaringen van de oudvaders</p>
            <div className="hint">
              Zoek op bijbelreferentie, bijvoorbeeld:<br />
              Joh 3:16 &middot; Psalm 23:1 &middot; Gen 1:1
            </div>
          </div>
        )}
      </div>
    </>
  );
}
