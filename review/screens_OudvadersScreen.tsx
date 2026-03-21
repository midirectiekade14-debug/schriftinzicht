import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { colors, spacing, fontSize, fonts } from '../constants/theme';
import type { Author } from '../types/database';

export default function OudvadersScreen() {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEra, setFilterEra] = useState<string | null>(null);
  const navigation = useNavigation<any>();

  useEffect(() => {
    loadAuthors();
  }, []);

  const loadAuthors = async () => {
    const { data } = await supabase
      .from('authors')
      .select('*')
      .order('born_year', { ascending: true });
    setAuthors(data || []);
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const eras = [...new Set(authors.map((a) => a.era).filter(Boolean))] as string[];
  const filtered = filterEra ? authors.filter((a) => a.era === filterEra) : authors;

  const renderAuthor = ({ item, index }: { item: Author; index: number }) => {
    const years = item.born_year ? `${item.born_year}–${item.died_year || '?'}` : '';
    const eraColor = item.era ? colors.eras[item.era] : undefined;
    const initials = item.name
      .split(' ')
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();

    return (
      <TouchableOpacity
        style={styles.authorCard}
        activeOpacity={0.7}
        onPress={() =>
          navigation.navigate('OudvaderDetail', {
            authorId: item.id,
            authorName: item.name,
          })
        }
      >
        {item.portrait_url ? (
          <Image source={{ uri: item.portrait_url }} style={styles.portrait} />
        ) : (
          <View
            style={[
              styles.portrait,
              styles.portraitPlaceholder,
              eraColor && { borderColor: eraColor, borderWidth: 2 },
            ]}
          >
            <Text style={styles.portraitInitial}>{initials}</Text>
          </View>
        )}
        <View style={styles.authorInfo}>
          <Text style={styles.authorName}>{item.name}</Text>
          <View style={styles.metaRow}>
            {years ? <Text style={styles.authorYears}>{years}</Text> : null}
            {item.era && eraColor ? (
              <View style={[styles.eraTag, { backgroundColor: eraColor + '18' }]}>
                <Text style={[styles.eraText, { color: eraColor }]}>{item.era}</Text>
              </View>
            ) : null}
          </View>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Era filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        <TouchableOpacity
          style={[styles.filterBtn, !filterEra && styles.filterBtnActive]}
          onPress={() => setFilterEra(null)}
        >
          <Text style={[styles.filterText, !filterEra && styles.filterTextActive]}>
            Allen ({authors.length})
          </Text>
        </TouchableOpacity>
        {eras.map((era) => {
          const cnt = authors.filter((a) => a.era === era).length;
          const eraColor = colors.eras[era];
          const active = filterEra === era;
          return (
            <TouchableOpacity
              key={era}
              style={[
                styles.filterBtn,
                active && { backgroundColor: eraColor + '18', borderColor: eraColor + '60' },
              ]}
              onPress={() => setFilterEra(active ? null : era)}
            >
              <Text
                style={[
                  styles.filterText,
                  active && { color: eraColor },
                ]}
              >
                {era} ({cnt})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderAuthor}
        contentContainerStyle={styles.list}
        ListFooterComponent={
          <Text style={styles.footer}>
            {filtered.length} oudvader{filtered.length !== 1 ? 's' : ''}
            {filterEra ? ` · ${filterEra}` : ''} · 1483–1892
          </Text>
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>Geen auteurs gevonden.</Text>
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  filterScroll: {
    flexGrow: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    flexDirection: 'row',
  },
  filterBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginRight: spacing.xs,
  },
  filterBtnActive: {
    backgroundColor: colors.surfaceActive,
    borderColor: colors.surfaceActiveBorder,
  },
  filterText: {
    fontSize: 14,
    fontFamily: fonts.sans,
    color: colors.textFaint,
    fontWeight: '500',
  },
  filterTextActive: {
    color: colors.accent,
  },
  list: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  authorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  portrait: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  portraitPlaceholder: {
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: colors.border,
    borderWidth: 2,
  },
  portraitInitial: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.accent,
    fontFamily: fonts.serifBold,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    fontFamily: fonts.serifBold,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  authorYears: {
    fontSize: 14,
    fontFamily: fonts.sans,
    color: colors.textMuted,
  },
  eraTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
  },
  eraText: {
    fontSize: 14,
    fontFamily: fonts.sans,
    fontWeight: '500',
  },
  chevron: {
    fontSize: 20,
    color: colors.textFaint,
  },
  footer: {
    textAlign: 'center',
    fontSize: 15,
    fontFamily: fonts.sans,
    color: colors.textFaint,
    marginTop: spacing.md,
    opacity: 0.7,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
