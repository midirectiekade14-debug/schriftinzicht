import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { colors, spacing, fontSize, fonts } from '../constants/theme';
import type { BibleBook } from '../types/database';

const OT_CATEGORIES = [
  { name: 'Wet', bookNames: ['Genesis', 'Exodus', 'Leviticus', 'Numeri', 'Deuteronomium'] },
  { name: 'Geschiedenis', bookNames: ['Jozua', 'Richteren', 'Ruth', '1 Samuël', '2 Samuël', '1 Koningen', '2 Koningen', '1 Kronieken', '2 Kronieken', 'Ezra', 'Nehemia', 'Esther'] },
  { name: 'Poëzie', bookNames: ['Job', 'Psalmen', 'Spreuken', 'Prediker', 'Hooglied'] },
  { name: 'Profeten', bookNames: ['Jesaja', 'Jeremia', 'Klaagliederen', 'Ezechiël', 'Daniël', 'Hosea', 'Joël', 'Amos', 'Obadja', 'Jona', 'Micha', 'Nahum', 'Habakuk', 'Zefanja', 'Haggaï', 'Zacharia', 'Maleachi'] },
];

const NT_CATEGORIES = [
  { name: 'Evangeliën', bookNames: ['Mattheüs', 'Markus', 'Lukas', 'Johannes'] },
  { name: 'Geschiedenis', bookNames: ['Handelingen'] },
  { name: 'Brieven van Paulus', bookNames: ['Romeinen', '1 Korinthe', '2 Korinthe', 'Galaten', 'Efeze', 'Filippenzen', 'Kolossenzen', '1 Thessalonicenzen', '2 Thessalonicenzen', '1 Timotheüs', '2 Timotheüs', 'Titus', 'Filemon'] },
  { name: 'Algemene brieven', bookNames: ['Hebreeën', 'Jakobus', '1 Petrus', '2 Petrus', '1 Johannes', '2 Johannes', '3 Johannes', 'Judas'] },
  { name: 'Profetie', bookNames: ['Openbaring'] },
];

function normalizeBookName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findBook(books: BibleBook[], catName: string): BibleBook | undefined {
  const norm = normalizeBookName(catName);
  const exact = books.find((b) => normalizeBookName(b.name) === norm);
  if (exact) return exact;
  return books.find((b) => {
    const bn = normalizeBookName(b.name);
    return bn.startsWith(norm) || norm.startsWith(bn);
  });
}

export default function BijbelScreen() {
  const [allBooks, setAllBooks] = useState<BibleBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [testament, setTestament] = useState<'ot' | 'nt'>('ot');
  const navigation = useNavigation<any>();

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    const { data } = await supabase
      .from('bible_books')
      .select('*')
      .order('book_order', { ascending: true });
    setAllBooks(data || []);
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const otBooks = allBooks.filter((b) => b.testament === 'OT');
  const ntBooks = allBooks.filter((b) => b.testament === 'NT');
  const categories = testament === 'ot' ? OT_CATEGORIES : NT_CATEGORIES;
  const books = testament === 'ot' ? otBooks : ntBooks;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerLabel}>SchriftInzicht</Text>
        <Text style={styles.headerTitle}>Bijbel</Text>
      </View>

      {/* OT / NT segmented control */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, testament === 'ot' && styles.toggleBtnActive]}
          onPress={() => setTestament('ot')}
        >
          <Text style={[styles.toggleText, testament === 'ot' && styles.toggleTextActive]}>
            Oude Testament
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, testament === 'nt' && styles.toggleBtnActive]}
          onPress={() => setTestament('nt')}
        >
          <Text style={[styles.toggleText, testament === 'nt' && styles.toggleTextActive]}>
            Nieuwe Testament
          </Text>
        </TouchableOpacity>
      </View>

      {/* Categorised 2-column book grid */}
      {categories.map((cat) => {
        const catBooks = cat.bookNames
          .map((name) => findBook(books, name))
          .filter(Boolean) as BibleBook[];
        if (catBooks.length === 0) return null;
        return (
          <View key={cat.name} style={styles.category}>
            <Text style={styles.categoryName}>{cat.name}</Text>
            <View style={styles.booksGrid}>
              {catBooks.map((book) => (
                <TouchableOpacity
                  key={book.id}
                  style={styles.bookCard}
                  activeOpacity={0.7}
                  onPress={() =>
                    navigation.navigate('Hoofdstukken', {
                      bookId: book.id,
                      bookName: book.name,
                      chapterCount: book.chapter_count,
                    })
                  }
                >
                  <Text style={styles.bookName} numberOfLines={1}>
                    {book.name}
                  </Text>
                  <Text style={styles.chapterCount}>{book.chapter_count}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      })}

      <Text style={styles.footer}>
        {testament === 'ot' ? '39' : '27'} boeken · Statenvertaling
      </Text>
    </ScrollView>
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
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingTop: spacing.sm,
  },
  headerLabel: {
    fontSize: 15,
    fontFamily: fonts.sans,
    color: colors.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 3,
    marginBottom: spacing.xs,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '600',
    color: colors.accent,
    fontFamily: fonts.serifBold,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 3,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: colors.surfaceActive,
  },
  toggleText: {
    fontSize: 15,
    fontFamily: fonts.sans,
    color: colors.textFaint,
    fontWeight: '500',
  },
  toggleTextActive: {
    color: colors.accent,
  },
  category: {
    marginBottom: spacing.lg,
  },
  categoryName: {
    fontSize: 15,
    fontFamily: fonts.sans,
    fontWeight: '600',
    color: colors.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: spacing.sm,
    paddingLeft: 4,
  },
  booksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  bookCard: {
    width: '47.5%',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookName: {
    fontSize: 16,
    fontFamily: fonts.serifBold,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginRight: 4,
  },
  chapterCount: {
    fontSize: 14,
    fontFamily: fonts.sans,
    color: colors.textFaint,
  },
  footer: {
    textAlign: 'center',
    fontSize: 14,
    fontFamily: fonts.sans,
    color: colors.textFaint,
    marginTop: spacing.sm,
    opacity: 0.6,
  },
});
