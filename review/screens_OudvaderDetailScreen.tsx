import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { colors, spacing, fontSize, fonts } from '../constants/theme';
import type { Author, Commentary } from '../types/database';

interface CommentaryWithPassage extends Commentary {
  passage?: string;
}

export default function OudvaderDetailScreen() {
  const route = useRoute<any>();
  const { authorId, authorName } = route.params as { authorId: number; authorName: string };

  const [author, setAuthor] = useState<Author | null>(null);
  const [commentaries, setCommentaries] = useState<CommentaryWithPassage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [authorRes, commentaryRes] = await Promise.all([
      supabase.from('authors').select('*').eq('id', authorId).single(),
      supabase
        .from('commentaries')
        .select('*, bible_verses(chapter, verse, bible_books(name, abbreviation))')
        .eq('author_id', authorId)
        .order('verse_id', { ascending: true })
        .limit(50),
    ]);

    if (authorRes.data) setAuthor(authorRes.data);

    if (commentaryRes.data) {
      const withPassage = commentaryRes.data.map((c: any) => {
        const bv = c.bible_verses;
        const passage = bv
          ? `${bv.bible_books?.abbreviation ?? ''} ${bv.chapter}:${bv.verse}`
          : '';
        return { ...c, passage };
      });
      setCommentaries(withPassage);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const years =
    author && author.born_year
      ? `${author.born_year}–${author.died_year || '?'}`
      : '';
  const eraColor = author?.era ? colors.eras[author.era] : undefined;
  const initials = authorName
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const renderHeader = () => (
    <View style={styles.header}>
      {author?.portrait_url ? (
        <Image
          source={{ uri: author.portrait_url }}
          style={[styles.portrait, eraColor && { borderColor: eraColor, borderWidth: 2 }]}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.portrait, styles.portraitPlaceholder, eraColor && { borderColor: eraColor, borderWidth: 2 }]}>
          <Text style={styles.portraitInitial}>{initials}</Text>
        </View>
      )}
      <Text style={styles.authorName}>{authorName}</Text>
      {years ? <Text style={styles.authorYears}>{years}</Text> : null}
      {author?.era && eraColor ? (
        <View style={styles.eraTag}>
          <View style={[styles.eraDot, { backgroundColor: eraColor }]} />
          <Text style={[styles.eraTagText, { color: eraColor }]}>{author.era}</Text>
        </View>
      ) : null}
      {author?.biography ? (
        <Text style={styles.authorBio}>{author.biography}</Text>
      ) : null}
      <View style={styles.divider} />
      <Text style={styles.sectionTitle}>
        Commentaren ({commentaries.length})
      </Text>
    </View>
  );

  const renderCommentary = ({ item }: { item: CommentaryWithPassage }) => (
    <View style={styles.commentaryCard}>
      {item.passage ? (
        <Text style={styles.passage}>{item.passage}</Text>
      ) : null}
      <Text style={styles.commentaryText}>{item.commentary_text}</Text>
      {item.year_written ? (
        <Text style={styles.yearWritten}>{item.year_written}</Text>
      ) : null}
    </View>
  );

  return (
    <FlatList
      style={styles.container}
      data={commentaries}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderCommentary}
      ListHeaderComponent={renderHeader}
      contentContainerStyle={styles.list}
      ListEmptyComponent={
        <Text style={styles.emptyText}>Geen commentaren gevonden voor deze auteur.</Text>
      }
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
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  portrait: {
    width: 110,
    height: 110,
    borderRadius: 55,
    marginBottom: spacing.sm,
    backgroundColor: colors.card,
  },
  portraitPlaceholder: {
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  portraitInitial: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.accent,
    fontFamily: fonts.serifBold,
  },
  authorName: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    fontFamily: fonts.serifBold,
    textAlign: 'center',
  },
  authorYears: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  eraTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
  },
  eraDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  eraTagText: {
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
  authorBio: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.sm,
    lineHeight: 22,
    textAlign: 'center',
    fontFamily: fonts.serif,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    alignSelf: 'flex-start',
  },
  commentaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  passage: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.accent,
    marginBottom: spacing.xs,
  },
  commentaryText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 22,
    fontFamily: fonts.serif,
  },
  yearWritten: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: 'right',
    fontStyle: 'italic',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
