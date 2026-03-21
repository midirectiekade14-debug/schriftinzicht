import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { colors, spacing, fontSize, fonts } from '../constants/theme';
import type { BibleVerse, Commentary, CrossReference, Kanttekening } from '../types/database';

interface CommentaryWithAuthor extends Omit<Commentary, 'authors'> {
  authors: { name: string; born_year: number | null; died_year: number | null; era: string | null; portrait_url: string | null } | null;
}

export default function VerzenScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { bookId, bookName, chapter } = route.params;
  const { user } = useAuth();
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [loading, setLoading] = useState(true);
  const [maxChapter, setMaxChapter] = useState<number>(chapter);
  const [selectedVerseId, setSelectedVerseId] = useState<number | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [kanttekeningen, setKanttekeningen] = useState<Kanttekening[]>([]);
  const [commentaries, setCommentaries] = useState<CommentaryWithAuthor[]>([]);
  const [crossRefs, setCrossRefs] = useState<CrossReference[]>([]);
  const [commentaryExpanded, setCommentaryExpanded] = useState<Record<number, boolean>>({});
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(new Set());
  const [bookmarkLoading, setBookmarkLoading] = useState<number | null>(null);

  useEffect(() => {
    loadVerses();
    supabase
      .from('bible_verses')
      .select('chapter')
      .eq('book_id', bookId)
      .order('chapter', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) setMaxChapter(data[0].chapter);
      });
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('bookmarks')
      .select('verse_id')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (data) setBookmarkedIds(new Set(data.map((b: { verse_id: number }) => b.verse_id)));
      });
  }, [user]);

  const toggleBookmark = async (verseId: number) => {
    if (!user) return;
    setBookmarkLoading(verseId);
    if (bookmarkedIds.has(verseId)) {
      await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('verse_id', verseId);
      setBookmarkedIds((prev) => { const s = new Set(prev); s.delete(verseId); return s; });
    } else {
      await supabase.from('bookmarks').insert({ user_id: user.id, verse_id: verseId });
      setBookmarkedIds((prev) => new Set(prev).add(verseId));
    }
    setBookmarkLoading(null);
  };

  const loadVerses = async () => {
    const { data } = await supabase
      .from('bible_verses')
      .select('*')
      .eq('book_id', bookId)
      .eq('chapter', chapter)
      .order('verse', { ascending: true });
    setVerses(data || []);
    setLoading(false);
  };

  const handleVerseTap = async (verseId: number) => {
    if (selectedVerseId === verseId) {
      setSelectedVerseId(null);
      setKanttekeningen([]);
      setCommentaries([]);
      setCrossRefs([]);
      setCommentaryExpanded({});
      return;
    }
    setSelectedVerseId(verseId);
    setKanttekeningen([]);
    setCommentaries([]);
    setCrossRefs([]);
    setCommentaryExpanded({});
    setDetailLoading(true);

    const [kantRes, commRes, crossRes] = await Promise.all([
      supabase
        .from('kanttekeningen')
        .select('*')
        .eq('verse_id', verseId)
        .order('note_order', { ascending: true }),
      supabase
        .from('commentaries')
        .select('*, authors(name, born_year, died_year, era, portrait_url)')
        .eq('verse_id', verseId)
        .order('year_written', { ascending: true }),
      supabase
        .from('cross_references')
        .select('id, votes, to_verse_id, to_verse_end_id, to_verse:bible_verses!to_verse_id(chapter, verse, bible_books(name, abbreviation))')
        .eq('from_verse_id', verseId)
        .gt('votes', 0)
        .order('votes', { ascending: false })
        .limit(15),
    ]);

    setKanttekeningen((kantRes.data || []) as Kanttekening[]);
    setCommentaries((commRes.data || []) as CommentaryWithAuthor[]);
    setCrossRefs((crossRes.data || []) as unknown as CrossReference[]);
    setDetailLoading(false);
  };

  const toggleCommentary = (id: number) => {
    setCommentaryExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const navigateChapter = (newChapter: number) => {
    navigation.replace('Verzen', { bookId, bookName, chapter: newChapter });
  };

  const navigateToRef = (ref: CrossReference) => {
    const tv = ref.to_verse as any;
    if (!tv) return;
    const abbrev = tv.bible_books?.abbreviation ?? '';
    const name = tv.bible_books?.name ?? '';
    const identifier = abbrev || name;
    if (!identifier) return;
    const label = `${identifier} ${tv.chapter}:${tv.verse}`;
    navigation.navigate('ZoekenTab', {
      screen: 'Zoeken',
      params: { prefill: label },
    });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={verses}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.list}
      ListHeaderComponent={null}
      ListFooterComponent={
        <View style={styles.chapterNav}>
          <TouchableOpacity
            style={[styles.chapterNavBtn, chapter <= 1 && styles.chapterNavBtnDisabled]}
            onPress={() => chapter > 1 && navigateChapter(chapter - 1)}
            disabled={chapter <= 1}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={18} color={chapter <= 1 ? colors.textFaint : colors.accent} />
            <Text style={[styles.chapterNavText, chapter <= 1 && styles.chapterNavTextDisabled]}>
              Hoofdstuk {chapter - 1}
            </Text>
          </TouchableOpacity>
          <Text style={styles.chapterNavLabel}>{chapter} / {maxChapter}</Text>
          <TouchableOpacity
            style={[styles.chapterNavBtn, chapter >= maxChapter && styles.chapterNavBtnDisabled]}
            onPress={() => chapter < maxChapter && navigateChapter(chapter + 1)}
            disabled={chapter >= maxChapter}
            activeOpacity={0.7}
          >
            <Text style={[styles.chapterNavText, chapter >= maxChapter && styles.chapterNavTextDisabled]}>
              Hoofdstuk {chapter + 1}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={chapter >= maxChapter ? colors.textFaint : colors.accent} />
          </TouchableOpacity>
        </View>
      }
      renderItem={({ item }) => {
        const isSelected = selectedVerseId === item.id;
        return (
          <View>
            <TouchableOpacity
              style={[styles.verseRow, isSelected && styles.verseRowSelected]}
              onPress={() => handleVerseTap(item.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.verseNum}>{item.verse}</Text>
              <Text style={styles.verseText}>{item.text_sv}</Text>
            </TouchableOpacity>

            {isSelected && (
              <View style={styles.panel}>
                {detailLoading ? (
                  <ActivityIndicator size="small" color={colors.accent} style={{ marginVertical: spacing.md }} />
                ) : (
                  <>
                    {/* Kanttekeningen */}
                    {kanttekeningen.length > 0 && (
                      <View style={styles.detailSection}>
                        <Text style={styles.panelTitle}>Kanttekeningen</Text>
                        {kanttekeningen.map((kt) => (
                          <View key={kt.id} style={styles.kantItem}>
                            {kt.marker ? (
                              <View style={styles.markerBadge}>
                                <Text style={styles.markerText}>{kt.marker}</Text>
                              </View>
                            ) : null}
                            <Text style={styles.kantText}>{kt.note_text}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Verklaringen */}
                    {commentaries.length > 0 && (
                      <View style={styles.detailSection}>
                        <Text style={styles.panelTitle}>
                          Verklaringen ({commentaries.length})
                        </Text>
                        {commentaries.map((c) => {
                          const isOpen = commentaryExpanded[c.id];
                          const text = c.commentary_text || '';
                          const preview = text.length > 200 ? text.slice(0, 200) + '...' : text;
                          const authorName = c.authors?.name || 'Onbekend';
                          const years = c.authors?.born_year
                            ? `${c.authors.born_year}\u2013${c.authors.died_year || '?'}`
                            : '';
                          const eraColor = c.authors?.era ? colors.eras[c.authors.era] : undefined;
                          const portraitUrl = c.authors?.portrait_url;
                          const initials = authorName.split(' ').map((w: string) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
                          return (
                            <TouchableOpacity
                              key={c.id}
                              style={styles.commentaryCard}
                              onPress={() => toggleCommentary(c.id)}
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
                                {c.year_written ? (
                                  <Text style={styles.yearBadge}>{c.year_written}</Text>
                                ) : null}
                              </View>
                              <Text style={styles.commentaryText}>
                                {isOpen ? text : preview}
                              </Text>
                              {text.length > 200 && (
                                <Text style={styles.expandHint}>
                                  {isOpen ? 'Inklappen \u25B2' : 'Lees meer \u25BC'}
                                </Text>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}

                    {/* Kruisverwijzingen */}
                    {crossRefs.length > 0 && (
                      <View style={styles.detailSection}>
                        <Text style={styles.panelTitle}>Kruisverwijzingen ({crossRefs.length})</Text>
                        <View style={styles.chipGrid}>
                          {crossRefs.map((ref) => {
                            const tv = ref.to_verse as any;
                            const abbrev = tv?.bible_books?.abbreviation ?? '';
                            const name = tv?.bible_books?.name ?? '';
                            const identifier = abbrev || name;
                            const label = identifier ? `${identifier} ${tv.chapter}:${tv.verse}` : '\u2014';
                            return (
                              <TouchableOpacity
                                key={ref.id}
                                style={styles.chip}
                                onPress={() => navigateToRef(ref)}
                              >
                                <Text style={styles.chipText}>{label}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    )}

                    {kanttekeningen.length === 0 && commentaries.length === 0 && crossRefs.length === 0 && (
                      <Text style={styles.panelEmpty}>
                        Geen kanttekeningen, verklaringen of kruisverwijzingen gevonden.
                      </Text>
                    )}
                  </>
                )}

                <View style={styles.panelFooter}>
                  <TouchableOpacity
                    style={styles.panelLink}
                    activeOpacity={0.75}
                    onPress={() =>
                      navigation.navigate('ZoekenTab', {
                        screen: 'Zoeken',
                        params: { prefill: `${bookName} ${chapter}:${item.verse}` },
                      })
                    }
                  >
                    <Text style={styles.panelLinkLabel}>Lees de verklaringen van de oudvaders</Text>
                    <Text style={styles.panelLinkSub}>Commentaar · Kanttekeningen · Kruisverwijzingen</Text>
                  </TouchableOpacity>
                  {user && (
                    <TouchableOpacity
                      onPress={() => toggleBookmark(item.id)}
                      disabled={bookmarkLoading === item.id}
                      hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                    >
                      {bookmarkLoading === item.id ? (
                        <ActivityIndicator size="small" color={colors.accent} />
                      ) : (
                        <Ionicons
                          name={bookmarkedIds.has(item.id) ? 'bookmark' : 'bookmark-outline'}
                          size={22}
                          color={bookmarkedIds.has(item.id) ? colors.accent : colors.textFaint}
                        />
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  list: {
    padding: spacing.md,
  },
  header: {
    fontSize: fontSize.xl,
    color: colors.text,
    marginBottom: spacing.md,
    fontFamily: fonts.serifBold,
  },
  verseRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  verseRowSelected: {
    borderBottomColor: colors.accent,
  },
  verseNum: {
    width: 30,
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.accent,
    paddingTop: 2,
  },
  verseText: {
    flex: 1,
    fontSize: fontSize.md,
    lineHeight: 24,
    color: colors.text,
    fontFamily: fonts.serif,
  },
  panel: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceActiveBorder,
  },
  detailSection: {
    marginBottom: spacing.md,
  },
  panelTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  panelEmpty: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginVertical: spacing.xs,
  },
  kantItem: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  markerBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  markerText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: fonts.sans,
    fontWeight: '600',
  },
  kantText: {
    flex: 1,
    fontSize: fontSize.sm,
    lineHeight: 20,
    color: colors.textSecondary,
    fontFamily: fonts.serif,
  },
  commentaryCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.sm + 4,
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
    lineHeight: 20,
    color: colors.textSecondary,
    fontFamily: fonts.serif,
  },
  expandHint: {
    fontSize: fontSize.xs,
    color: colors.accent,
    marginTop: spacing.xs,
    textAlign: 'right',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    backgroundColor: colors.tagBg,
    borderRadius: 10,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderWidth: 1,
    borderColor: colors.tagBorder,
  },
  chipText: {
    fontSize: fontSize.xs,
    color: colors.accent,
    fontWeight: '600',
  },
  panelFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  panelLink: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.accent + '55',
    borderRadius: 10,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  panelLinkLabel: {
    fontFamily: fonts.serifBold,
    fontSize: fontSize.md,
    color: colors.accent,
    textAlign: 'center',
    marginBottom: 3,
  },
  panelLinkSub: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    color: colors.textFaint,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  chapterNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  chapterNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  chapterNavBtnDisabled: {
    opacity: 0.35,
  },
  chapterNavText: {
    fontSize: fontSize.sm,
    color: colors.accent,
    fontWeight: '600',
  },
  chapterNavTextDisabled: {
    color: colors.textFaint,
  },
  chapterNavLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
});
