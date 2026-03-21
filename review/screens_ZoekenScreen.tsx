import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { colors, spacing, fontSize, fonts } from '../constants/theme';
import type { BibleVerse, Commentary, CrossReference, Kanttekening } from '../types/database';

// Normalize Dutch Bible book references
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

const BOOK_NAME_LOOKUP: Record<string, string> = {};
for (const canonical of Object.values(BOOK_ALIASES)) {
  BOOK_NAME_LOOKUP[canonical.toLowerCase()] = canonical;
}

function parseReference(input: string): { book: string; chapter: number; verse: number } | null {
  const trimmed = input.trim();
  const multiMatch = trimmed.match(
    /^(.+?)\s+(\d+)\s*[:.,]\s*(\d+)(?:\s*[-–]\s*\d+)?$/i
  );
  if (multiMatch) {
    const rawMulti = multiMatch[1].trim().toLowerCase();
    if (BOOK_NAME_LOOKUP[rawMulti]) {
      return { book: BOOK_NAME_LOOKUP[rawMulti], chapter: parseInt(multiMatch[2], 10), verse: parseInt(multiMatch[3], 10) };
    }
    const compressed = rawMulti.replace(/\s+/g, '');
    if (BOOK_ALIASES[compressed]) {
      return { book: BOOK_ALIASES[compressed], chapter: parseInt(multiMatch[2], 10), verse: parseInt(multiMatch[3], 10) };
    }
    if (BOOK_ALIASES[rawMulti]) {
      return { book: BOOK_ALIASES[rawMulti], chapter: parseInt(multiMatch[2], 10), verse: parseInt(multiMatch[3], 10) };
    }
  }
  const match = trimmed.match(
    /^(\d?\s*[a-zA-Zëüïéà]+)\.?\s*(\d+)\s*[:.,]\s*(\d+)(?:\s*[-–]\s*\d+)?$/i
  );
  if (!match) return null;
  const rawBook = match[1].replace(/\s+/g, '').toLowerCase();
  const bookName = BOOK_ALIASES[rawBook];
  if (!bookName) return null;
  return { book: bookName, chapter: parseInt(match[2], 10), verse: parseInt(match[3], 10) };
}

interface CommentaryWithAuthor extends Omit<Commentary, 'authors'> {
  authors: { name: string; born_year: number | null; died_year: number | null; era: string | null; portrait_url: string | null } | null;
}

interface DailyVerse {
  ref: string;
  text: string;
  authorName: string;
  commentary: string;
}

function useDailyVerse() {
  const [daily, setDaily] = useState<DailyVerse | null>(null);

  useEffect(() => {
    (async () => {
      // Deterministic "random" based on day of year
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 0);
      const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000);

      // Pick a verse that has commentaries
      const { data: comms } = await supabase
        .from('commentaries')
        .select('verse_id, commentary_text, authors(name)')
        .not('commentary_text', 'is', null)
        .limit(200);

      if (!comms?.length) return;
      const pick = comms[dayOfYear % comms.length] as any;

      const { data: verses } = await supabase
        .from('bible_verses')
        .select('text_sv, chapter, verse, bible_books(name, abbreviation)')
        .eq('id', pick.verse_id)
        .limit(1);

      if (!verses?.length) return;
      const v = verses[0] as any;
      const bookName = v.bible_books?.name || v.bible_books?.abbreviation || '';

      setDaily({
        ref: `${bookName} ${v.chapter}:${v.verse}`,
        text: v.text_sv,
        authorName: pick.authors?.name || '',
        commentary: (pick.commentary_text || '').slice(0, 250) + (pick.commentary_text?.length > 250 ? '...' : ''),
      });
    })();
  }, []);

  return daily;
}

const POPULAR_THEMES = [
  { label: 'Genade', query: 'genade' },
  { label: 'Geloof', query: 'geloof' },
  { label: 'Verkiezing', query: 'verkiezing' },
  { label: 'Verbond', query: 'verbond' },
  { label: 'Bekering', query: 'bekering' },
  { label: 'Troost', query: 'troost' },
  { label: 'Gebed', query: 'gebed' },
  { label: 'Lijden', query: 'lijden' },
];

// Canonical book list in Bible order (unique, preserving first-seen order)
const CANONICAL_BOOKS: string[] = [];
const _seen = new Set<string>();
for (const canonical of Object.values(BOOK_ALIASES)) {
  if (!_seen.has(canonical)) { _seen.add(canonical); CANONICAL_BOOKS.push(canonical); }
}

export default function ZoekenScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [verse, setVerse] = useState<BibleVerse | null>(null);
  const [commentaries, setCommentaries] = useState<CommentaryWithAuthor[]>([]);
  const [kanttekeningen, setKanttekeningen] = useState<Kanttekening[]>([]);
  const [crossRefs, setCrossRefs] = useState<CrossReference[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [textResults, setTextResults] = useState<BibleVerse[]>([]);
  const [previousQuery, setPreviousQuery] = useState<string>('');
  const [previousTextResults, setPreviousTextResults] = useState<BibleVerse[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([
    'Psalm 23:1',
    'rechtvaardiging',
    'Johannes 3:16',
  ]);
  const dailyVerse = useDailyVerse();

  useEffect(() => {
    const prefill = route.params?.prefill;
    if (prefill && prefill !== query) {
      setQuery(prefill);
    }
  }, [route.params?.prefill]);

  useEffect(() => {
    if (route.params?.prefill && query === route.params.prefill && query) {
      search();
    }
  }, [query, route.params?.prefill]);

  const addRecentSearch = (q: string) => {
    setRecentSearches((prev) => {
      const next = [q, ...prev.filter((r) => r !== q)].slice(0, 5);
      return next;
    });
  };

  const computeSuggestions = useCallback((text: string) => {
    const lower = text.toLowerCase().trim();
    if (!lower || lower.includes(':')) { setSuggestions([]); return; }

    // Book + chapter already typed (e.g. "Johannes 3") → suggest "Johannes 3:"
    const chapterMatch = lower.match(/^(.+?)\s+(\d+)$/);
    if (chapterMatch) {
      const part = chapterMatch[1];
      const compressed = part.replace(/\s+/g, '');
      const bookName = BOOK_ALIASES[part] || BOOK_ALIASES[compressed] || BOOK_NAME_LOOKUP[part];
      if (bookName) { setSuggestions([`${bookName} ${chapterMatch[2]}:`]); return; }
    }

    // Match book names by prefix (canonical name or any alias)
    const lowerCompressed = lower.replace(/\s+/g, '');
    const seenMatches = new Set<string>();
    const matches: string[] = [];
    for (const [alias, canonical] of Object.entries(BOOK_ALIASES)) {
      if (!seenMatches.has(canonical) && (
        canonical.toLowerCase().startsWith(lower) ||
        alias.startsWith(lowerCompressed)
      )) {
        seenMatches.add(canonical);
        matches.push(canonical);
        if (matches.length >= 6) break;
      }
    }
    setSuggestions(matches);
  }, []);

  const selectSuggestion = (s: string) => {
    const newQuery = s.endsWith(':') ? s : s + ' ';
    setQuery(newQuery);
    computeSuggestions(newQuery);
  };

  const search = useCallback(async (overrideQuery?: string) => {
    const q = (overrideQuery ?? query).trim();
    const ref = parseReference(q);

    if (!ref) {
      // Full-text search on verse text
      if (q.length < 2) {
        setError('Voer minimaal 2 tekens in om te zoeken.');
        return;
      }
      addRecentSearch(q);
      setLoading(true);
      setError(null);
      setVerse(null);
      setTextResults([]);
      setCommentaries([]);
      setKanttekeningen([]);
      setCrossRefs([]);
      setExpanded({});
      try {
        const { data, error: dbErr } = await supabase
          .from('bible_verses')
          .select('*, bible_books(name, abbreviation)')
          .ilike('text_sv', `%${q}%`)
          .limit(50);
        if (dbErr) throw dbErr;
        setTextResults((data || []) as BibleVerse[]);
        if (!data?.length) setError(`Geen verzen gevonden voor "${q}".`);
      } catch {
        setError('Fout bij het zoeken. Controleer je internetverbinding.');
      } finally {
        setLoading(false);
      }
      return;
    }

    setTextResults([]);
    addRecentSearch(q);
    setLoading(true);
    setError(null);
    setExpanded({});
    setCrossRefs([]);

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
        setLoading(false);
        return;
      }

      setVerse(verses[0] as BibleVerse);
      setIsBookmarked(false);

      if (user) {
        supabase
          .from('bookmarks')
          .select('id')
          .eq('user_id', user.id)
          .eq('verse_id', verses[0].id)
          .limit(1)
          .then(({ data }) => setIsBookmarked(!!(data && data.length > 0)));
      }

      const [commsRes, kantRes, crossRes] = await Promise.all([
        supabase
          .from('commentaries')
          .select('*, authors(name, born_year, died_year, era, portrait_url)')
          .eq('verse_id', verses[0].id)
          .order('year_written', { ascending: true }),
        supabase
          .from('kanttekeningen')
          .select('*')
          .eq('verse_id', verses[0].id)
          .order('note_order', { ascending: true }),
        supabase
          .from('cross_references')
          .select('id, votes, to_verse_id, to_verse_end_id, to_verse:bible_verses!to_verse_id(chapter, verse, bible_books(name, abbreviation))')
          .eq('from_verse_id', verses[0].id)
          .gt('votes', 0)
          .order('votes', { ascending: false })
          .limit(20),
      ]);

      setCommentaries((commsRes.data || []) as CommentaryWithAuthor[]);
      setKanttekeningen(kantRes.data || []);
      setCrossRefs((crossRes.data || []) as unknown as CrossReference[]);
    } catch (e) {
      setError('Fout bij het zoeken. Controleer je internetverbinding.');
    } finally {
      setLoading(false);
    }
  }, [query]);

  const toggleBookmark = async () => {
    if (!user) {
      navigation.navigate('ZoekenTab', { screen: 'Zoeken' });
      return;
    }
    if (!verse) return;
    if (isBookmarked) {
      await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('verse_id', verse.id);
      setIsBookmarked(false);
    } else {
      await supabase.from('bookmarks').insert({ user_id: user.id, verse_id: verse.id });
      setIsBookmarked(true);
    }
  };

  const toggleExpand = (id: number | string) => {
    const key = String(id);
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const renderCommentary = ({ item }: { item: CommentaryWithAuthor }) => {
    const isExpanded = expanded[String(item.id)];
    const text = item.commentary_text || '';
    const preview = text.length > 200 ? text.slice(0, 200) + '...' : text;
    const authorName = item.authors?.name || 'Onbekend';
    const years = item.authors?.born_year
      ? `${item.authors.born_year}–${item.authors.died_year || '?'}`
      : '';
    const eraColor = item.authors?.era ? colors.eras[item.authors.era] : undefined;
    const portraitUrl = item.authors?.portrait_url;
    const initials = authorName.split(' ').map((w: string) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

    return (
      <TouchableOpacity
        style={styles.commentaryCard}
        onPress={() => toggleExpand(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.commentaryHeader}>
          {portraitUrl ? (
            <Image source={{ uri: portraitUrl }} style={[styles.authorThumb, eraColor && { borderColor: eraColor }]} />
          ) : (
            <View style={[styles.authorThumb, styles.authorThumbPlaceholder, eraColor && { borderColor: eraColor }]}>
              <Text style={styles.authorThumbInitials}>{initials}</Text>
            </View>
          )}
          <View style={styles.authorMeta}>
            <Text style={styles.authorName}>{authorName}</Text>
            {years ? <Text style={styles.authorYears}>{years}</Text> : null}
          </View>
          {item.year_written ? (
            <Text style={styles.yearBadge}>{item.year_written}</Text>
          ) : null}
        </View>
        <Text style={styles.commentaryText}>
          {isExpanded ? text : preview}
        </Text>
        {text.length > 200 && (
          <Text style={styles.expandHint}>
            {isExpanded ? 'Inklappen' : 'Lees meer'}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderTextResult = ({ item }: { item: BibleVerse }) => {
    const bookName = (item.bible_books as any)?.name || '';
    const refLabel = `${bookName} ${item.chapter}:${item.verse}`;
    return (
      <TouchableOpacity
        style={styles.textResultCard}
        onPress={() => {
          if (textResults.length > 0) {
            setPreviousQuery(query);
            setPreviousTextResults(textResults);
          }
          setQuery(refLabel);
          search(refLabel);
        }}
        activeOpacity={0.7}
      >
        <Text style={styles.verseRef}>{refLabel}</Text>
        <Text style={styles.verseText} numberOfLines={4}>{item.text_sv}</Text>
      </TouchableOpacity>
    );
  };

  const renderResults = () => (
    <>
      {previousTextResults.length > 0 && verse && (
        <TouchableOpacity
          style={styles.backToResultsButton}
          onPress={() => {
            setQuery(previousQuery);
            setTextResults(previousTextResults);
            setVerse(null);
            setPreviousQuery('');
            setPreviousTextResults([]);
            setCommentaries([]);
            setKanttekeningen([]);
            setCrossRefs([]);
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={15} color={colors.accent} />
          <Text style={styles.backToResultsText}>Terug naar &ldquo;{previousQuery}&rdquo;</Text>
        </TouchableOpacity>
      )}
      {verse && (
        <View style={styles.verseContainer}>
          <View style={styles.verseHeader}>
            <Text style={styles.verseRef}>
              {(verse.bible_books as any)?.name} {verse.chapter}:{verse.verse}
            </Text>
            <TouchableOpacity onPress={toggleBookmark} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <Ionicons
                name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                size={20}
                color={isBookmarked ? colors.accent : colors.textMuted}
              />
            </TouchableOpacity>
          </View>
          <Text style={styles.verseText}>{verse.text_sv}</Text>
        </View>
      )}

      {verse && !loading && kanttekeningen.length > 0 && (
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Kanttekeningen ({kanttekeningen.length})</Text>
          {kanttekeningen.map((kt) => (
            <View key={kt.id} style={styles.kantItem}>
              {kt.marker ? (
                <View style={styles.kantMarkerBadge}>
                  <Text style={styles.kantMarkerText}>{kt.marker}</Text>
                </View>
              ) : null}
              <Text style={styles.kantText}>{kt.note_text}</Text>
            </View>
          ))}
        </View>
      )}

      {verse && !loading && (
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>
            Verklaringen ({commentaries.length})
          </Text>
          {commentaries.length === 0 ? (
            <Text style={styles.emptyText}>
              Geen verklaringen gevonden voor dit vers.
            </Text>
          ) : (
            <FlatList
              data={commentaries}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderCommentary}
              scrollEnabled={false}
              contentContainerStyle={styles.list}
            />
          )}
        </View>
      )}

      {verse && !loading && crossRefs.length > 0 && (
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>
            Kruisverwijzingen ({crossRefs.length})
          </Text>
          <View style={styles.crossRefGrid}>
            {crossRefs.map((ref) => {
              const tv = ref.to_verse as any;
              const abbrev = tv?.bible_books?.abbreviation ?? '';
              const name = tv?.bible_books?.name ?? '';
              const identifier = abbrev || name;
              const label = identifier ? `${identifier} ${tv.chapter}:${tv.verse}` : '—';
              return (
                <TouchableOpacity
                  key={ref.id}
                  style={styles.crossRefChip}
                  onPress={() => { if (label !== '—') { setQuery(label); search(label); } }}
                >
                  <Text style={styles.crossRefText}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </>
  );

  const renderWelcome = () => (
    <View style={styles.welcomeContainer}>
      {/* Popular themes */}
      <View style={styles.themesRow}>
        {POPULAR_THEMES.map((th) => (
          <TouchableOpacity
            key={th.query}
            style={styles.themeChip}
            onPress={() => { setQuery(th.query); search(th.query); }}
          >
            <Text style={styles.themeChipText}>{th.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Daily verse */}
      {dailyVerse && (
        <TouchableOpacity
          style={styles.dailyCard}
          activeOpacity={0.8}
          onPress={() => { setQuery(dailyVerse.ref); search(dailyVerse.ref); }}
        >
          <View style={styles.dailyHeader}>
            <Ionicons name="sparkles" size={14} color={colors.accent} />
            <Text style={styles.dailyLabel}>Dagvers</Text>
          </View>
          <Text style={styles.dailyRef}>{dailyVerse.ref}</Text>
          <Text style={styles.dailyText}>{dailyVerse.text}</Text>
          {dailyVerse.authorName ? (
            <View style={styles.dailyFooter}>
              <Text style={styles.dailyAuthor}>{dailyVerse.authorName}</Text>
              <Text style={styles.dailyComm} numberOfLines={2}>{dailyVerse.commentary}</Text>
            </View>
          ) : null}
          <View style={styles.dailyActions}>
            <TouchableOpacity style={styles.dailyActionBtn}>
              <Ionicons name="share-outline" size={14} color={colors.accent} />
              <Text style={styles.dailyActionText}>Delen</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dailyActionBtn}>
              <Text style={styles.dailyActionText}>Alle verklaringen</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      {/* Recent searches */}
      {recentSearches.length > 0 && (
        <View style={styles.recentSection}>
          <Text style={styles.recentLabel}>Recent gezocht</Text>
          {recentSearches.map((r) => (
            <TouchableOpacity
              key={r}
              style={styles.recentItem}
              onPress={() => { setQuery(r); search(r); }}
            >
              <Ionicons name="search-outline" size={16} color={colors.textMuted} />
              <Text style={styles.recentText}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.searchContainer}>
        <View style={styles.searchInputRow}>
          <Ionicons name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Zoek op woord of referentie, bijv. genade"
            placeholderTextColor={colors.textFaint}
            value={query}
            onChangeText={(text) => { setQuery(text); computeSuggestions(text); }}
            onSubmitEditing={() => { setSuggestions([]); search(); }}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); setSuggestions([]); setVerse(null); setTextResults([]); setError(null); setPreviousQuery(''); setPreviousTextResults([]); }}>
              <Ionicons name="close-circle" size={18} color={colors.textFaint} />
            </TouchableOpacity>
          )}
        </View>
        {suggestions.length > 0 && (
          <View style={styles.suggestionsDropdown}>
            {suggestions.map((s, i) => (
              <TouchableOpacity
                key={s}
                style={[styles.suggestionItem, i === suggestions.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => selectSuggestion(s)}
              >
                <Ionicons name={s.endsWith(':') ? 'bookmark-outline' : 'book-outline'} size={13} color={colors.accent} style={{ marginRight: 8 }} />
                <Text style={styles.suggestionText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {loading && (
        <ActivityIndicator size="large" color={colors.accent} style={styles.loader} />
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={
          verse
            ? [{ type: 'ref' as const }]
            : textResults.map((v) => ({ type: 'text' as const, data: v }))
        }
        keyExtractor={(item) => item.type === 'ref' ? 'results' : String((item as any).data.id)}
        renderItem={({ item }) =>
          item.type === 'ref' ? renderResults() : renderTextResult({ item: (item as any).data })
        }
        ListHeaderComponent={
          textResults.length > 0 && !verse ? (
            <Text style={styles.textResultsHeader}>
              {textResults.length} vers{textResults.length !== 1 ? 'en' : ''} gevonden
            </Text>
          ) : null
        }
        ListEmptyComponent={!loading && !error ? renderWelcome : null}
        contentContainerStyle={styles.scrollContent}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 50,
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  suggestionsDropdown: {
    marginTop: 4,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontFamily: fonts.serif,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm + 4,
    fontSize: fontSize.md,
    color: colors.text,
    fontFamily: fonts.sans,
  },
  scrollContent: {
    paddingBottom: spacing.xl * 2,
  },
  loader: {
    marginTop: spacing.xl,
  },
  errorContainer: {
    marginHorizontal: spacing.md,
    padding: spacing.md,
    backgroundColor: 'rgba(231,76,60,0.1)',
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSize.sm,
  },
  verseContainer: {
    margin: spacing.md,
    marginTop: 0,
    padding: spacing.md + 2,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.surfaceActiveBorder,
  },
  verseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  verseRef: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  verseText: {
    fontSize: fontSize.lg,
    lineHeight: 28,
    color: colors.text,
    fontFamily: fonts.serif,
  },
  sectionContainer: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  crossRefGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  crossRefChip: {
    backgroundColor: colors.tagBg,
    borderRadius: 10,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderWidth: 1,
    borderColor: colors.tagBorder,
  },
  crossRefText: {
    fontSize: fontSize.xs,
    color: colors.accent,
    fontWeight: '600',
  },
  kantItem: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  kantMarkerBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  kantMarkerText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  kantText: {
    flex: 1,
    fontSize: fontSize.sm,
    lineHeight: 20,
    color: colors.textSecondary,
    fontFamily: fonts.serif,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textFaint,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  list: {
    paddingBottom: spacing.xl,
  },
  commentaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md + 2,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  commentaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  eraDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  authorThumb: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: colors.border,
  },
  authorThumbPlaceholder: {
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorThumbInitials: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textMuted,
  },
  authorMeta: {
    flex: 1,
  },
  authorName: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.text,
  },
  authorYears: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 1,
  },
  yearBadge: {
    fontSize: fontSize.xs,
    color: colors.accent,
    backgroundColor: colors.accentLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
    marginLeft: 'auto',
  },
  commentaryText: {
    fontSize: fontSize.sm,
    lineHeight: 22,
    color: colors.textSecondary,
    fontFamily: fonts.serif,
  },
  expandHint: {
    fontSize: fontSize.xs,
    color: colors.accent,
    marginTop: spacing.sm,
    textAlign: 'right',
  },
  // Welcome / empty state
  welcomeContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  themesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  themeChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: colors.tagBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.tagBorder,
  },
  themeChipText: {
    fontSize: 14,
    fontFamily: fonts.sans,
    color: colors.textMuted,
    fontWeight: '500',
  },
  dailyCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.md + 4,
    borderWidth: 1,
    borderColor: colors.divider,
    marginBottom: spacing.lg,
  },
  dailyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  dailyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: fonts.sans,
  },
  dailyRef: {
    fontSize: 14,
    color: colors.accent,
    fontFamily: fonts.serifBold,
    marginBottom: spacing.xs,
  },
  dailyText: {
    fontSize: fontSize.md,
    lineHeight: 24,
    color: colors.text,
    fontFamily: fonts.serif,
    marginBottom: spacing.md,
  },
  dailyFooter: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    marginBottom: spacing.md,
  },
  dailyAuthor: {
    fontSize: 14,
    fontFamily: fonts.sans,
    color: colors.textFaint,
    marginBottom: spacing.xs,
  },
  dailyComm: {
    fontSize: fontSize.sm,
    lineHeight: 22,
    color: colors.textSecondary,
    fontFamily: fonts.serif,
  },
  dailyActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  dailyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.tagBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.tagBorder,
  },
  dailyActionText: {
    fontSize: 14,
    fontFamily: fonts.sans,
    color: colors.accent,
    fontWeight: '500',
  },
  recentSection: {
    marginBottom: spacing.lg,
  },
  recentLabel: {
    fontSize: 15,
    fontFamily: fonts.sans,
    fontWeight: '600',
    color: colors.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs,
  },
  recentText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.sans,
    color: colors.textSecondary,
  },
  backToResultsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accent + '40',
    gap: 6,
  },
  backToResultsText: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.accent,
  },
  textResultCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md + 2,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textResultsHeader: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
});
