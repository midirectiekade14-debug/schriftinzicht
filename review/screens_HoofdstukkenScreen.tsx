import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { colors, spacing, fontSize, fonts } from '../constants/theme';

interface BookNav {
  id: number;
  name: string;
  chapter_count: number;
  book_order: number;
}

export default function HoofdstukkenScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { bookId, bookName, chapterCount } = route.params;
  const [prevBook, setPrevBook] = useState<BookNav | null>(null);
  const [nextBook, setNextBook] = useState<BookNav | null>(null);

  const chapters = Array.from({ length: chapterCount }, (_, i) => i + 1);

  useEffect(() => {
    loadAdjacentBooks();
  }, [bookId]);

  const loadAdjacentBooks = async () => {
    // Get current book's order
    const { data: current } = await supabase
      .from('bible_books')
      .select('book_order')
      .eq('id', bookId)
      .single();
    if (!current) return;

    const [prevRes, nextRes] = await Promise.all([
      supabase
        .from('bible_books')
        .select('id, name, chapter_count, book_order')
        .lt('book_order', current.book_order)
        .order('book_order', { ascending: false })
        .limit(1),
      supabase
        .from('bible_books')
        .select('id, name, chapter_count, book_order')
        .gt('book_order', current.book_order)
        .order('book_order', { ascending: true })
        .limit(1),
    ]);

    setPrevBook(prevRes.data?.[0] ?? null);
    setNextBook(nextRes.data?.[0] ?? null);
  };

  const navigateBook = (book: BookNav) => {
    navigation.replace('Hoofdstukken', {
      bookId: book.id,
      bookName: book.name,
      chapterCount: book.chapter_count,
    });
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={chapters}
        numColumns={5}
        keyExtractor={(item) => String(item)}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.chapterButton}
            activeOpacity={0.7}
            onPress={() =>
              navigation.navigate('Verzen', {
                bookId,
                bookName,
                chapter: item,
              })
            }
          >
            <Text style={styles.chapterText}>{item}</Text>
          </TouchableOpacity>
        )}
        ListFooterComponent={
          <View style={styles.bookNav}>
            <TouchableOpacity
              style={[styles.bookNavBtn, !prevBook && styles.bookNavBtnDisabled]}
              onPress={() => prevBook && navigateBook(prevBook)}
              disabled={!prevBook}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={16} color={prevBook ? colors.accent : colors.textFaint} />
              <Text style={[styles.bookNavText, !prevBook && styles.bookNavTextDisabled]} numberOfLines={1}>
                {prevBook ? prevBook.name : '—'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bookNavBtn, !nextBook && styles.bookNavBtnDisabled]}
              onPress={() => nextBook && navigateBook(nextBook)}
              disabled={!nextBook}
              activeOpacity={0.7}
            >
              <Text style={[styles.bookNavText, !nextBook && styles.bookNavTextDisabled]} numberOfLines={1}>
                {nextBook ? nextBook.name : '—'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={nextBook ? colors.accent : colors.textFaint} />
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  grid: {
    padding: spacing.md,
  },
  chapterButton: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: '18%',
    margin: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  chapterText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.accent,
  },
  bookNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  bookNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    maxWidth: '45%',
  },
  bookNavBtnDisabled: {
    opacity: 0.3,
  },
  bookNavText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.serifBold,
    color: colors.accent,
  },
  bookNavTextDisabled: {
    color: colors.textFaint,
  },
});
