import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, fontSize, spacing } from '../constants/theme';

const ERA_COLORS: Record<string, string> = {
  Reformatie: '#D4A574',
  'Nadere Reformatie': '#8BB89E',
  'Puriteinse periode': '#7BA8C8',
  '19e eeuw': '#C8A870',
};

const DEMO_PASSAGES: Record<string, {
  verses: { ref: string; text: string }[];
  commentaries: { author: string; year: number; era: string; text: string }[];
  confessionRefs: { source: string; ref: string; text: string }[];
  crossRefs: string[];
}> = {
  'Romeinen 8:28-30': {
    verses: [
      { ref: 'Romeinen 8:28', text: 'En wij weten, dat dengenen, die God liefhebben, alle dingen medewerken ten goede, namelijk dengenen, die naar Zijn voornemen geroepen zijn.' },
      { ref: 'Romeinen 8:29', text: 'Want die Hij te voren gekend heeft, die heeft Hij ook te voren verordineerd, den beelde Zijns Zoons gelijkvormig te zijn, opdat Hij de Eerstgeborene zij onder vele broederen.' },
      { ref: 'Romeinen 8:30', text: 'En die Hij te voren verordineerd heeft, dezen heeft Hij ook geroepen; en die Hij geroepen heeft, dezen heeft Hij ook gerechtvaardigd; en die Hij gerechtvaardigd heeft, dezen heeft Hij ook verheerlijkt.' },
    ],
    commentaries: [
      {
        author: 'Johannes Calvijn', year: 1540, era: 'Reformatie',
        text: 'Paulus leert ons hier dat alles wat de gelovigen overkomt, hun tot heil strekt. Niet dat alle dingen op zichzelf goed zijn, maar dat God ze alle bestuurt en richt tot het welzijn der Zijnen. De gouden keten van vers 29-30 toont de onverbrekelijke samenhang van Gods heilswerk: voorkennis, verordineering, roeping, rechtvaardiging en verheerlijking.',
      },
      {
        author: 'Kanttekeningen SV', year: 1637, era: 'Nadere Reformatie',
        text: 'Alle dingen: zowel voorspoed als tegenspoed, zowel kruis als troost. Medewerken ten goede: niet altijd ten tijdelijken, maar altijd ten eeuwigen goede. Naar Zijn voornemen: dat is, naar het eeuwig besluit en de vrije verkiezing Gods. Te voren gekend: niet slechts vooruit geweten, maar met een kennis der goedkeuring en des welbehagens uitverkoren.',
      },
      {
        author: 'Matthew Henry', year: 1706, era: 'Puriteinse periode',
        text: 'Alle dingen — niet alleen aangename dingen, maar ook beproevingen. De gouden keten: gekend, verordineerd, geroepen, gerechtvaardigd, verheerlijkt. Merk op dat de verheerlijking in de verleden tijd staat, alsof het reeds geschied is — zo zeker is Gods voornemen.',
      },
      {
        author: 'C.H. Spurgeon', year: 1870, era: '19e eeuw',
        text: 'Hier hebben wij een keten van vijf schakels, gesmeed in de eeuwigheid en reikend tot in de eeuwigheid. Geen schakel kan breken, want elke schakel is goddelijk. Het begint met voorkennis — niet het blote vooruit weten, maar het liefdevol kennen.',
      },
    ],
    confessionRefs: [
      { source: 'Heidelbergse Catechismus', ref: 'Zondag 1, Vraag 1', text: 'Dat ik met lichaam en ziel, beide in het leven en sterven, niet mijn, maar mijns getrouwen Zaligmakers Jezus Christus eigen ben...' },
      { source: 'Dordtse Leerregels', ref: 'Hoofdstuk I, Artikel 7', text: 'Deze verkiezing is een onveranderlijk voornemen Gods, door hetwelk Hij vóór de grondlegging der wereld een zekere menigte van mensen uitverkoren heeft...' },
      { source: 'Nederlandse Geloofsbelijdenis', ref: 'Artikel 16', text: 'Wij geloven dat God, toen het ganse geslacht van Adam door de zonde des eersten mensen in verderfenis en ondergang was gestort, bewezen heeft dat Hij barmhartig en rechtvaardig is...' },
    ],
    crossRefs: ['Efeze 1:3-14', '2 Timotheüs 1:9', '1 Petrus 1:2', 'Jeremia 29:11'],
  },
};

type TabKey = 'commentaries' | 'confessions' | 'crossrefs';

export default function PreekVoorbereidingScreen() {
  const [query, setQuery] = useState('');
  const [activePassage, setActivePassage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('commentaries');

  const handleSearch = (q?: string) => {
    const val = (q ?? query).trim();
    const found = Object.keys(DEMO_PASSAGES).find(
      k => k.toLowerCase() === val.toLowerCase()
    );
    if (found) {
      setActivePassage(found);
      setActiveTab('commentaries');
    }
  };

  const data = activePassage ? DEMO_PASSAGES[activePassage] : null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Zoekbalk */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.textFaint} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => handleSearch()}
            placeholder="Voer uw preektekst in, bijv. Romeinen 8:28-30"
            placeholderTextColor={colors.textFaint}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => { setQuery(''); setActivePassage(null); }}>
              <Ionicons name="close" size={16} color={colors.textFaint} />
            </Pressable>
          )}
        </View>
        <TouchableOpacity style={styles.searchBtn} onPress={() => handleSearch()}>
          <Text style={styles.searchBtnText}>Zoek</Text>
        </TouchableOpacity>
      </View>

      {/* Suggestie */}
      {!activePassage && (
        <View style={styles.suggestRow}>
          <TouchableOpacity
            style={styles.suggestChip}
            onPress={() => { setQuery('Romeinen 8:28-30'); handleSearch('Romeinen 8:28-30'); }}
          >
            <Text style={styles.suggestText}>Probeer: Romeinen 8:28-30</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Resultaten */}
      {data && (
        <View style={styles.results}>

          {/* Bijbeltekst */}
          <View style={styles.bibleBlock}>
            <View style={styles.bibleBlockHeader}>
              <Ionicons name="book-outline" size={16} color={colors.accent} />
              <Text style={styles.biblePassageRef}>{activePassage}</Text>
              <View style={styles.svBadge}>
                <Text style={styles.svBadgeText}>Statenvertaling</Text>
              </View>
            </View>
            {data.verses.map((v, i) => (
              <Text key={i} style={[styles.bibleVerse, i < data.verses.length - 1 && styles.bibleVerseMargin]}>
                <Text style={styles.bibleVerseNum}>{v.ref.split(':')[1] ?? i + 1} </Text>
                {v.text}
              </Text>
            ))}
          </View>

          {/* Tabs */}
          <View style={styles.tabs}>
            {([
              { key: 'commentaries' as TabKey, label: 'Verklaringen', count: data.commentaries.length },
              { key: 'confessions' as TabKey, label: 'Belijdenissen', count: data.confessionRefs.length },
              { key: 'crossrefs' as TabKey, label: 'Kruisverwijzingen', count: data.crossRefs.length },
            ]).map(tab => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                  {tab.label} ({tab.count})
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Verklaringen */}
          {activeTab === 'commentaries' && (
            <View style={styles.section}>
              {data.commentaries.map((c, i) => {
                const eraColor = ERA_COLORS[c.era] || colors.accent;
                return (
                  <View key={i} style={[styles.commentCard, { borderLeftColor: eraColor }]}>
                    <View style={styles.commentHeader}>
                      <Text style={styles.commentAuthor}>{c.author}</Text>
                      <View style={styles.commentMeta}>
                        <Text style={styles.commentYear}>{c.year}</Text>
                        <View style={[styles.eraBadge, { backgroundColor: eraColor + '18' }]}>
                          <Text style={[styles.eraText, { color: eraColor }]}>{c.era}</Text>
                        </View>
                      </View>
                    </View>
                    <Text style={styles.commentText}>{c.text}</Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Belijdenissen */}
          {activeTab === 'confessions' && (
            <View style={styles.section}>
              {data.confessionRefs.map((c, i) => (
                <View key={i} style={styles.confessionCard}>
                  <View style={styles.confessionHeader}>
                    <Ionicons name="document-text-outline" size={16} color="#A88BC4" />
                    <Text style={styles.confessionSource}>{c.source}</Text>
                    <Text style={styles.confessionRef}>{c.ref}</Text>
                  </View>
                  <Text style={styles.confessionText}>{c.text}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Kruisverwijzingen */}
          {activeTab === 'crossrefs' && (
            <View style={styles.crossRefsRow}>
              {data.crossRefs.map((ref, i) => (
                <View key={i} style={styles.crossRefChip}>
                  <Ionicons name="link-outline" size={14} color="#7BA8C8" />
                  <Text style={styles.crossRefText}>{ref}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Export */}
          <View style={styles.exportRow}>
            <TouchableOpacity style={styles.exportBtn}>
              <Ionicons name="document-outline" size={16} color={colors.accent} />
              <Text style={styles.exportText}>Exporteer als PDF voor preekvoorbereiding</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: 48,
  },

  // Zoekbalk
  searchRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(231,225,216,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(231,225,216,0.1)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontFamily: fonts.serif,
    fontSize: 16,
    padding: 0,
  },
  searchBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(139,90,43,0.5)',
    justifyContent: 'center',
  },
  searchBtnText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: fontSize.sm,
    color: '#F4E4D4',
  },

  // Suggestie
  suggestRow: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  suggestChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(196,149,106,0.2)',
    backgroundColor: 'rgba(196,149,106,0.06)',
  },
  suggestText: {
    fontFamily: fonts.serif,
    fontSize: fontSize.sm,
    color: colors.accent,
  },

  // Resultaten
  results: {
    marginTop: 16,
  },

  // Bijbeltekst
  bibleBlock: {
    backgroundColor: 'rgba(231,225,216,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(231,225,216,0.08)',
    borderRadius: 18,
    padding: 20,
    marginBottom: 14,
  },
  bibleBlockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  biblePassageRef: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 17,
    color: colors.accent,
    flex: 1,
  },
  svBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: 'rgba(196,149,106,0.1)',
    borderRadius: 8,
  },
  svBadgeText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textFaint,
  },
  bibleVerse: {
    fontFamily: fonts.serif,
    fontSize: 16,
    color: colors.text,
    lineHeight: 26,
  },
  bibleVerseMargin: {
    marginBottom: 10,
  },
  bibleVerseNum: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
    color: colors.accent,
  },

  // Tabs
  tabs: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 14,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(231,225,216,0.03)',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: 'rgba(196,149,106,0.12)',
  },
  tabText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textFaint,
    textAlign: 'center',
  },
  tabTextActive: {
    color: colors.accent,
    fontFamily: fonts.sansSemiBold,
  },

  // Sectie
  section: {
    gap: 10,
  },

  // Verklaringen
  commentCard: {
    backgroundColor: 'rgba(231,225,216,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(231,225,216,0.06)',
    borderLeftWidth: 3,
    borderRadius: 14,
    padding: 18,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  commentAuthor: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 16,
    color: colors.text,
  },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  commentYear: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.textMuted,
  },
  eraBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  eraText: {
    fontFamily: fonts.sans,
    fontSize: 14,
  },
  commentText: {
    fontFamily: fonts.serif,
    fontSize: 17,
    color: colors.textSecondary,
    lineHeight: 26,
  },

  // Belijdenissen
  confessionCard: {
    backgroundColor: 'rgba(168,139,196,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(168,139,196,0.12)',
    borderRadius: 14,
    padding: 18,
  },
  confessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  confessionSource: {
    fontFamily: fonts.sansSemiBold,
    fontSize: fontSize.sm,
    color: '#A88BC4',
  },
  confessionRef: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textMuted,
  },
  confessionText: {
    fontFamily: fonts.serifItalic,
    fontSize: 17,
    color: colors.textSecondary,
    lineHeight: 26,
  },

  // Kruisverwijzingen
  crossRefsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  crossRefChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(123,168,200,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(123,168,200,0.15)',
    borderRadius: 12,
  },
  crossRefText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    color: '#7BA8C8',
  },

  // Export
  exportRow: {
    alignItems: 'center',
    marginTop: 20,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(196,149,106,0.3)',
    backgroundColor: 'rgba(196,149,106,0.05)',
  },
  exportText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    color: colors.accent,
  },
});
