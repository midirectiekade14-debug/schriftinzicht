import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { colors, spacing, fontSize, fonts } from '../constants/theme';

interface BookmarkItem {
  id: string;
  verse_id: number;
  created_at: string;
  verse: {
    chapter: number;
    verse: number;
    text_sv: string;
    bible_books: { name: string; abbreviation: string };
  };
}

export default function BladwijzersScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBookmarks = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('bookmarks')
      .select('id, verse_id, created_at, verse:bible_verses!verse_id(chapter, verse, text_sv, bible_books(name, abbreviation))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setBookmarks((data || []) as unknown as BookmarkItem[]);
    setLoading(false);
  }, [user]);

  useFocusEffect(useCallback(() => { loadBookmarks(); }, [loadBookmarks]));

  const deleteBookmark = async (id: string) => {
    Alert.alert('Bladwijzer verwijderen', 'Weet je het zeker?', [
      { text: 'Annuleren', style: 'cancel' },
      {
        text: 'Verwijderen', style: 'destructive',
        onPress: async () => {
          await supabase.from('bookmarks').delete().eq('id', id);
          setBookmarks((prev) => prev.filter((b) => b.id !== id));
        },
      },
    ]);
  };

  const navigateToVerse = (item: BookmarkItem) => {
    const abbrev = item.verse.bible_books?.abbreviation || item.verse.bible_books?.name || '';
    const ref = `${abbrev} ${item.verse.chapter}:${item.verse.verse}`;
    navigation.navigate('ZoekenTab', {
      screen: 'Zoeken',
      params: { prefill: ref },
    });
  };

  if (!user) {
    return (
      <View style={styles.centered}>
        <Ionicons name="bookmark-outline" size={48} color={colors.textFaint} />
        <Text style={styles.emptyTitle}>Niet ingelogd</Text>
        <Text style={styles.emptySubtitle}>Log in om bladwijzers op te slaan</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (bookmarks.length === 0) {
    return (
      <View style={styles.centered}>
        <Ionicons name="bookmark-outline" size={48} color={colors.textFaint} />
        <Text style={styles.emptyTitle}>Geen bladwijzers</Text>
        <Text style={styles.emptySubtitle}>
          Tik op het bladwijzer-icoon bij een vers om het op te slaan
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={bookmarks}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigateToVerse(item)}
          onLongPress={() => deleteBookmark(item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.cardLeft}>
            <Text style={styles.ref}>
              {item.verse.bible_books?.abbreviation || item.verse.bible_books?.name}{' '}
              {item.verse.chapter}:{item.verse.verse}
            </Text>
            <Text style={styles.verseText} numberOfLines={3}>
              {item.verse.text_sv}
            </Text>
          </View>
          <TouchableOpacity onPress={() => deleteBookmark(item.id)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Ionicons name="trash-outline" size={18} color={colors.textFaint} />
          </TouchableOpacity>
        </TouchableOpacity>
      )}
      ListHeaderComponent={
        <Text style={styles.count}>{bookmarks.length} bladwijzer{bookmarks.length !== 1 ? 's' : ''}</Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: spacing.md,
    fontFamily: fonts.serifBold,
  },
  emptySubtitle: {
    fontSize: fontSize.sm,
    color: colors.textFaint,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  count: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  cardLeft: {
    flex: 1,
  },
  ref: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  verseText: {
    fontSize: fontSize.sm,
    lineHeight: 20,
    color: colors.textSecondary,
    fontFamily: fonts.serif,
  },
});
