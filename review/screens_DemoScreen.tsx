import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Animated,
} from 'react-native';
import { colors, fonts, fontSize, spacing } from '../constants/theme';

interface DemoScreenProps {
  onComplete: () => void;
}

const ERA_COLORS: Record<string, string> = {
  Reformatie: '#D4A574',
  'Nadere Reformatie': '#8BB89E',
  'Puriteinse periode': '#7BA8C8',
  '19e eeuw': '#C8A870',
};

const TIMELINE = [
  {
    author: 'Calvijn',
    year: 1557,
    era: 'Reformatie',
    snippet:
      'David belijdt hier dat hij onder Gods hoede veilig is en niets te vrezen heeft. Het woord "mijn" wijst op een persoonlijke, levende betrekking.',
  },
  {
    author: 'Kanttekeningen SV',
    year: 1637,
    era: 'Nadere Reformatie',
    snippet:
      'Mijn Herder: die mij als een herder zijn schapen weidt, leidt, beschermt en verzorgt met alles wat nodig is voor dit tijdelijke en het eeuwige leven.',
  },
  {
    author: 'Matthew Henry',
    year: 1706,
    era: 'Puriteinse periode',
    snippet:
      'De HEERE is mijn Herder — niet slechts een Herder, maar mijn Herder. Wie de Heere tot Herder heeft, mag verzekerd zijn dat hem niets zal ontbreken.',
  },
  {
    author: 'Spurgeon',
    year: 1880,
    era: '19e eeuw',
    snippet:
      'De titel waarmee David de Heere benoemt is vol vertroostende betekenis. Het kleine woordje "mijn" verandert theologie in geloofsbeleving.',
  },
];

const DAILY_VERSE = {
  ref: 'Jesaja 40:31',
  text: 'Maar dien den HEERE verwachten, zullen de kracht vernieuwen; zij zullen opvaren met vleugelen, gelijk de arenden.',
  author: 'Matthew Henry',
  year: 1706,
  commentary:
    'Hier wordt de belofte gegeven aan hen die op de Heere wachten. Niet die in eigen kracht strijden, maar die in stilheid en vertrouwen hun sterkte vinden.',
};

const THEMES = ['Genade', 'Geloof', 'Verkiezing', 'Verbond', 'Bekering', 'Troost', 'Gebed', 'Lijden'];

const AUTHORS_SAMPLE = [
  { init: 'ML', name: 'Luther', years: '1483–1546', era: 'Reformatie' },
  { init: 'JC', name: 'Calvijn', years: '1509–1564', era: 'Reformatie' },
  { init: 'SV', name: 'Kanttekeningen', years: '1637', era: 'Nadere Reformatie' },
  { init: 'WB', name: 'À Brakel', years: '1635–1711', era: 'Nadere Reformatie' },
  { init: 'MH', name: 'M. Henry', years: '1662–1714', era: 'Puriteinse periode' },
  { init: 'CS', name: 'Spurgeon', years: '1834–1892', era: '19e eeuw' },
];

const BIBLE_SAMPLE = [
  { name: 'Genesis', abbr: 'Gen', ch: 50 },
  { name: 'Psalmen', abbr: 'Ps', ch: 150 },
  { name: 'Jesaja', abbr: 'Jes', ch: 66 },
  { name: 'Marcus', abbr: 'Marc', ch: 16 },
  { name: 'Lucas', abbr: 'Luc', ch: 24 },
  { name: 'Johannes', abbr: 'Joh', ch: 21 },
  { name: 'Romeinen', abbr: 'Rom', ch: 16 },
  { name: 'Hebreeën', abbr: 'Hebr', ch: 13 },
];

const PREEK_COMMENTARIES = [
  { author: 'Calvijn', year: 1540, era: 'Reformatie', text: 'Paulus leert ons hier dat alles wat de gelovigen overkomt, hun tot heil strekt. De gouden keten toont de onverbrekelijke samenhang van Gods heilswerk.' },
  { author: 'Kanttekeningen SV', year: 1637, era: 'Nadere Reformatie', text: 'Alle dingen: zowel voorspoed als tegenspoed. Naar Zijn voornemen: naar het eeuwig besluit en de vrije verkiezing Gods.' },
];

function SectionHeader({ label, title, subtitle }: { label: string; title: string; subtitle?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle && <Text style={styles.sectionDesc}>{subtitle}</Text>}
    </View>
  );
}

export default function DemoScreen({ onComplete }: DemoScreenProps) {
  const fade = useRef(new Animated.Value(0)).current;
  const itemAnims = TIMELINE.map(() => useRef(new Animated.Value(0)).current);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.stagger(100, itemAnims.map(a =>
        Animated.timing(a, { toValue: 1, duration: 400, useNativeDriver: true })
      )),
    ]).start();
  }, []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >

      {/* ── SECTIE 1: TIJDLIJN ─────────────────────────────── */}
      <Animated.View style={{ opacity: fade }}>
        <SectionHeader
          label="KERNFEATURE"
          title="Eén vers, vier eeuwen"
          subtitle="Zie bij elk vers wat theologen door de eeuwen heen schreven — chronologisch geordend."
        />
      </Animated.View>

      <Animated.View style={[styles.verseCard, { opacity: fade }]}>
        <Text style={styles.verseRef}>Psalm 23:1</Text>
        <Text style={styles.verseText}>
          De HEERE is mijn Herder, mij zal niets ontbreken.
        </Text>
      </Animated.View>

      <View style={styles.timeline}>
        {TIMELINE.map((item, i) => {
          const eraColor = ERA_COLORS[item.era] || colors.accent;
          return (
            <Animated.View
              key={i}
              style={[
                styles.timelineRow,
                {
                  opacity: itemAnims[i],
                  transform: [{ translateY: itemAnims[i].interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
                },
              ]}
            >
              <View style={styles.dotCol}>
                <View style={[styles.dot, { backgroundColor: eraColor }]} />
                {i < TIMELINE.length - 1 && <View style={styles.line} />}
              </View>
              <View style={styles.timelineCard}>
                <View style={styles.timelineCardHeader}>
                  <Text style={styles.timelineAuthor}>{item.author}</Text>
                  <Text style={[styles.timelineYear, { color: eraColor }]}>{item.year}</Text>
                </View>
                <Text style={styles.timelineSnippet}>{item.snippet}</Text>
              </View>
            </Animated.View>
          );
        })}
      </View>

      <View style={styles.divider} />

      {/* ── SECTIE 2: DAGVERS ──────────────────────────────── */}
      <SectionHeader
        label="DAGVERS"
        title="Elke dag een vers"
        subtitle="Dagelijks een vers met uitleg van een oudvader. Begin je dag met de Schrift."
      />

      <View style={styles.dailyCard}>
        <View style={styles.dailyBadge}>
          <Text style={styles.dailyBadgeText}>✦  Dagvers</Text>
        </View>
        <Text style={styles.dailyRef}>{DAILY_VERSE.ref}</Text>
        <Text style={styles.dailyText}>{DAILY_VERSE.text}</Text>
        <View style={styles.dailyDivider} />
        <Text style={styles.dailyAuthorLine}>{DAILY_VERSE.author} · {DAILY_VERSE.year}</Text>
        <Text style={styles.dailyCommentary}>{DAILY_VERSE.commentary}</Text>
      </View>

      <View style={styles.divider} />

      {/* ── SECTIE 3: ZOEK OP THEMA ────────────────────────── */}
      <SectionHeader
        label="ZOEKEN"
        title="Zoek op thema"
        subtitle="Niet alleen op vers, maar ook op woorden: rechtvaardiging, verkiezing, verbond."
      />

      <View style={styles.themeRow}>
        {THEMES.map(theme => (
          <View key={theme} style={styles.themeTag}>
            <Text style={styles.themeTagText}>{theme}</Text>
          </View>
        ))}
      </View>

      <View style={styles.divider} />

      {/* ── SECTIE 4: BIJBEL BLADEREN ──────────────────────── */}
      <SectionHeader
        label="BIJBEL"
        title="Statenvertaling"
        subtitle="Blader door het Oude en Nieuwe Testament. Tik een vers aan voor verklaringen en kanttekeningen."
      />

      <View style={styles.booksGrid}>
        {BIBLE_SAMPLE.map(book => (
          <View key={book.name} style={styles.bookCard}>
            <Text style={styles.bookName}>{book.name}</Text>
            <Text style={styles.bookChapters}>{book.ch} hfdst.</Text>
          </View>
        ))}
      </View>

      <View style={styles.divider} />

      {/* ── SECTIE 5: OUDVADERS ────────────────────────────── */}
      <SectionHeader
        label="OUDVADERS"
        title="16 theologen, vier eeuwen"
        subtitle="Van Luther tot Spurgeon — ontdek wie ze waren en lees hun verklaringen."
      />

      <View style={styles.authorsGrid}>
        {AUTHORS_SAMPLE.map(author => {
          const eraColor = ERA_COLORS[author.era] || colors.accent;
          return (
            <View key={author.name} style={styles.authorCard}>
              <View style={[styles.authorAvatar, { borderColor: eraColor + '30' }]}>
                <Text style={[styles.authorInit, { color: eraColor }]}>{author.init}</Text>
              </View>
              <Text style={styles.authorName}>{author.name}</Text>
              <Text style={styles.authorYears}>{author.years}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.divider} />

      {/* ── SECTIE 6: PREEKTEKST-MODUS ─────────────────────── */}
      <SectionHeader
        label="PREEKVOORBEREIDING"
        title="Alle verklaringen bij uw tekst"
        subtitle="Voer uw preektekst in en ontvang verklaringen, belijdenisverwijzingen en kruisreferenties."
      />

      <View style={styles.preekCard}>
        <View style={styles.preekVerseBlock}>
          <Text style={styles.preekRef}>Romeinen 8:28-30</Text>
          <Text style={styles.preekVerse}>
            En wij weten, dat dengenen, die God liefhebben, alle dingen medewerken ten goede...
          </Text>
        </View>

        <View style={styles.preekTabs}>
          {['Verklaringen (4)', 'Belijdenissen (3)', 'Kruisverwijzingen (4)'].map((tab, i) => (
            <View key={tab} style={[styles.preekTab, i === 0 && styles.preekTabActive]}>
              <Text style={[styles.preekTabText, i === 0 && styles.preekTabTextActive]}>{tab}</Text>
            </View>
          ))}
        </View>

        {PREEK_COMMENTARIES.map((c, i) => {
          const eraColor = ERA_COLORS[c.era] || colors.accent;
          return (
            <View key={i} style={[styles.preekComment, { borderLeftColor: eraColor }]}>
              <View style={styles.preekCommentHeader}>
                <Text style={styles.preekCommentAuthor}>{c.author}</Text>
                <View style={styles.preekCommentMeta}>
                  <Text style={styles.preekCommentYear}>{c.year}</Text>
                  <View style={[styles.preekEraBadge, { backgroundColor: eraColor + '18' }]}>
                    <Text style={[styles.preekEraText, { color: eraColor }]}>{c.era}</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.preekCommentText}>{c.text}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.divider} />

      {/* ── SECTIE 7: CATECHISMUS ──────────────────────────── */}
      <SectionHeader
        label="MEER"
        title="Heidelbergse Catechismus"
        subtitle="Alle 52 Zondagen met bewijsteksten — direct gekoppeld aan de Bijbelverklaringen."
      />

      <View style={styles.catCard}>
        <View style={styles.catSundayHeader}>
          <Text style={styles.catLabel}>Zondag 1 · Vraag 1</Text>
        </View>
        <Text style={styles.catQuestion}>
          Wat is uw enige troost, beide in het leven en sterven?
        </Text>
        <Text style={styles.catAnswer} numberOfLines={3}>
          Dat ik met lichaam en ziel, beide in het leven en sterven, niet mijn, maar mijns getrouwen Zaligmakers Jezus Christus eigen ben...
        </Text>
        <View style={styles.catRefs}>
          {['1 Kor 6:19-20', 'Rom 14:7-9', 'Joh 10:28'].map(ref => (
            <View key={ref} style={styles.catRefTag}>
              <Text style={styles.catRefText}>{ref}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── CTA ────────────────────────────────────────────── */}
      <View style={styles.ctaWrapper}>
        <Pressable style={styles.btn} onPress={onComplete}>
          <Text style={styles.btnText}>Begin met ontdekken</Text>
        </Pressable>
        <Text style={styles.ctaNote}>Gratis · Geen advertenties · Geen tracking</Text>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 48,
  },

  // Section header
  sectionHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  sectionLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: fontSize.xs,
    color: colors.accent,
    letterSpacing: 2,
    marginBottom: 8,
  },
  sectionTitle: {
    fontFamily: fonts.serifBold,
    fontSize: 20,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 8,
  },
  sectionDesc: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },

  // Vers kaart
  verseCard: {
    backgroundColor: 'rgba(231,225,216,0.03)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  verseRef: {
    fontFamily: fonts.sansSemiBold,
    fontSize: fontSize.sm,
    color: colors.accent,
    letterSpacing: 1,
    marginBottom: 8,
  },
  verseText: {
    fontFamily: fonts.serifItalic,
    fontSize: 18,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
  },

  // Tijdlijn
  timeline: {
    marginBottom: 8,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 14,
  },
  dotCol: {
    width: 20,
    alignItems: 'center',
    paddingTop: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  line: {
    width: 1,
    flex: 1,
    backgroundColor: colors.divider,
    marginTop: 4,
    minHeight: 16,
  },
  timelineCard: {
    flex: 1,
    backgroundColor: 'rgba(231,225,216,0.03)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  timelineCardHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 6,
  },
  timelineAuthor: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 15,
    color: colors.text,
  },
  timelineYear: {
    fontFamily: fonts.sans,
    fontSize: 14,
  },
  timelineSnippet: {
    fontFamily: fonts.serif,
    fontSize: 15,
    color: colors.textMuted,
    lineHeight: 22,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: 36,
  },

  // Dagvers
  dailyCard: {
    backgroundColor: 'rgba(196,149,106,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(196,149,106,0.15)',
    borderRadius: 20,
    padding: 22,
    marginBottom: 4,
  },
  dailyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dailyBadgeText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  dailyRef: {
    fontFamily: fonts.sansSemiBold,
    fontSize: fontSize.sm,
    color: colors.accent,
    marginBottom: 8,
  },
  dailyText: {
    fontFamily: fonts.serifItalic,
    fontSize: 17,
    color: colors.text,
    lineHeight: 25,
    marginBottom: 16,
  },
  dailyDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginBottom: 14,
  },
  dailyAuthorLine: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textFaint,
    marginBottom: 8,
  },
  dailyCommentary: {
    fontFamily: fonts.serif,
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
  },

  // Thema-tags
  themeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  themeTag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.tagBg,
    borderWidth: 1,
    borderColor: colors.tagBorder,
  },
  themeTagText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
    color: colors.textMuted,
  },

  // Bijbel boeken grid
  booksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  bookCard: {
    width: '31%',
    backgroundColor: 'rgba(231,225,216,0.03)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  bookName: {
    fontFamily: fonts.serifBold,
    fontSize: 15,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  bookChapters: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textFaint,
  },

  // Oudvaders grid
  authorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 4,
  },
  authorCard: {
    width: '30%',
    alignItems: 'center',
    backgroundColor: 'rgba(231,225,216,0.03)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
  },
  authorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1A1614',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  authorInit: {
    fontFamily: fonts.serifBold,
    fontSize: 18,
  },
  authorName: {
    fontFamily: fonts.serifBold,
    fontSize: 15,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 3,
  },
  authorYears: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textFaint,
    textAlign: 'center',
  },

  // Preektekst-modus
  preekCard: {
    backgroundColor: 'rgba(231,225,216,0.02)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 18,
    marginBottom: 4,
  },
  preekVerseBlock: {
    backgroundColor: 'rgba(231,225,216,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(231,225,216,0.06)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  preekRef: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 15,
    color: colors.accent,
    marginBottom: 8,
  },
  preekVerse: {
    fontFamily: fonts.serifItalic,
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
  },
  preekTabs: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  preekTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(231,225,216,0.03)',
    alignItems: 'center',
  },
  preekTabActive: {
    backgroundColor: 'rgba(196,149,106,0.12)',
  },
  preekTabText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textFaint,
    textAlign: 'center',
  },
  preekTabTextActive: {
    color: colors.accent,
  },
  preekComment: {
    backgroundColor: 'rgba(231,225,216,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(231,225,216,0.06)',
    borderLeftWidth: 3,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  preekCommentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  preekCommentAuthor: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 15,
    color: colors.text,
  },
  preekCommentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  preekCommentYear: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textMuted,
  },
  preekEraBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  preekEraText: {
    fontFamily: fonts.sans,
    fontSize: 14,
  },
  preekCommentText: {
    fontFamily: fonts.serif,
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
  },

  // Catechismus
  catCard: {
    backgroundColor: 'rgba(231,225,216,0.03)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 20,
    marginBottom: 4,
  },
  catSundayHeader: {
    marginBottom: 12,
  },
  catLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  catQuestion: {
    fontFamily: fonts.serifBold,
    fontSize: 17,
    color: colors.text,
    lineHeight: 25,
    marginBottom: 12,
  },
  catAnswer: {
    fontFamily: fonts.serif,
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
    fontStyle: 'italic',
    marginBottom: 14,
  },
  catRefs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  catRefTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: colors.tagBg,
    borderWidth: 1,
    borderColor: colors.tagBorder,
  },
  catRefText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textMuted,
  },

  // CTA
  ctaWrapper: {
    alignItems: 'center',
    gap: 14,
    marginTop: 12,
  },
  btn: {
    paddingHorizontal: 36,
    paddingVertical: 17,
    backgroundColor: colors.accent,
    borderRadius: 14,
  },
  btnText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 17,
    color: '#0C0A09',
  },
  ctaNote: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textFaint,
    letterSpacing: 0.5,
  },
});
