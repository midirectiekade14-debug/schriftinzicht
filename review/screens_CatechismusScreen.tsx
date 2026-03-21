import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { colors, spacing, fontSize, fonts } from '../constants/theme';
import type { CatechismQuestion } from '../types/database';

interface ProofText {
  id: number;
  question_id: number;
  verse_id: number;
  note: string | null;
  bible_verses: {
    chapter: number;
    verse: number;
    bible_books: { name: string; abbreviation: string } | null;
  } | null;
}

interface QuestionWithProofs extends CatechismQuestion {
  proofTexts?: ProofText[];
}

interface SundaySection {
  title: string;
  data: QuestionWithProofs[];
}

export default function CatechismusScreen() {
  const navigation = useNavigation<any>();
  const [sections, setSections] = useState<SundaySection[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadCatechism();
  }, []);

  const loadCatechism = async () => {
    const [questionsRes, proofsRes] = await Promise.all([
      supabase
        .from('catechism_questions')
        .select('*')
        .order('question_number', { ascending: true }),
      supabase
        .from('catechism_proof_texts')
        .select('id, question_id, verse_id, note, bible_verses(chapter, verse, bible_books(name, abbreviation))')
        .order('id', { ascending: true }),
    ]);

    const questions = questionsRes.data || [];
    const proofs = proofsRes.data || [];

    // Group proof texts by question_id
    const proofMap = new Map<number, ProofText[]>();
    for (const p of proofs) {
      const qId = p.question_id;
      if (!proofMap.has(qId)) proofMap.set(qId, []);
      proofMap.get(qId)!.push(p);
    }

    // Attach proof texts to questions
    const enriched: QuestionWithProofs[] = questions.map((q) => ({
      ...q,
      proofTexts: proofMap.get(q.id) || [],
    }));

    // Group by lord_day
    const grouped: Record<number, QuestionWithProofs[]> = {};
    for (const q of enriched) {
      const sunday = q.lord_day || 0;
      if (!grouped[sunday]) grouped[sunday] = [];
      grouped[sunday].push(q);
    }

    const sectionList: SundaySection[] = Object.entries(grouped)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([sunday, qs]) => ({
        title: Number(sunday) > 0 ? `Zondag ${sunday}` : 'Overig',
        data: qs,
      }));

    setSections(sectionList);
    setLoading(false);
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getProofRef = (pt: ProofText): string => {
    const bv = pt.bible_verses;
    if (!bv) return '?';
    const abbrev = bv.bible_books?.abbreviation || bv.bible_books?.name || '?';
    return `${abbrev} ${bv.chapter}:${bv.verse}`;
  };

  const handleProofPress = (reference: string) => {
    (navigation as any).navigate('ZoekenTab', {
      screen: 'Zoeken',
      params: { prefill: reference },
    });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (sections.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>Catechismus</Text>
        <Text style={styles.emptyText}>Geen vragen gevonden.</Text>
      </View>
    );
  }

  return (
    <SectionList
      style={styles.container}
      sections={sections}
      keyExtractor={(item) => String(item.id)}
      stickySectionHeadersEnabled={false}
      contentContainerStyle={styles.list}
      renderSectionHeader={({ section }) => (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
        </View>
      )}
      renderItem={({ item }) => {
        const isExpanded = expanded[String(item.id)];
        return (
          <TouchableOpacity
            style={[
              styles.questionCard,
              isExpanded && styles.questionCardOpen,
            ]}
            onPress={() => toggleExpand(String(item.id))}
            activeOpacity={0.7}
          >
            {/* Question header: V-badge + vraag + chevron */}
            <View style={styles.questionHeader}>
              <Text style={styles.questionBadge}>V{item.question_number}</Text>
              <Text style={styles.questionText}>{item.question_text}</Text>
              <Ionicons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.textFaint}
              />
            </View>

            {isExpanded && (
              <View style={styles.answerContainer}>
                {/* Answer */}
                <Text style={styles.answerBadge}>A{item.question_number}</Text>
                <Text style={styles.answerText}>{item.answer_text}</Text>

                {item.proofTexts && item.proofTexts.length > 0 && (
                  <View style={styles.proofsContainer}>
                    <Text style={styles.proofsLabel}>Bewijsteksten</Text>
                    <View style={styles.proofsGrid}>
                      {item.proofTexts.map((pt) => {
                        const ref = getProofRef(pt);
                        return (
                          <TouchableOpacity
                            key={pt.id}
                            style={styles.proofChip}
                            onPress={() => handleProofPress(ref)}
                          >
                            <Text style={styles.proofText}>{ref}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>
            )}
          </TouchableOpacity>
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
    padding: spacing.xl,
  },
  list: {
    padding: spacing.md,
  },
  sectionHeader: {
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    fontFamily: fonts.serifBold,
  },
  questionCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md + 2,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  questionCardOpen: {
    backgroundColor: colors.surfaceActive,
    borderColor: colors.surfaceActiveBorder,
    borderRadius: 16,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  questionBadge: {
    fontSize: 15,
    fontFamily: fonts.sans,
    fontWeight: '700',
    color: colors.accent,
    minWidth: 28,
  },
  questionText: {
    flex: 1,
    fontSize: 17,
    lineHeight: 26,
    color: colors.text,
    fontWeight: '500',
    fontFamily: fonts.serif,
  },
  answerContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  answerBadge: {
    fontSize: 15,
    fontFamily: fonts.sans,
    fontWeight: '700',
    color: colors.accent,
    marginBottom: spacing.xs,
  },
  answerText: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 28,
    fontFamily: fonts.serifItalic,
    fontStyle: 'italic',
  },
  proofsContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
  },
  proofsLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  proofsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  proofChip: {
    backgroundColor: colors.tagBg,
    borderRadius: 10,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderWidth: 1,
    borderColor: colors.tagBorder,
  },
  proofText: {
    fontSize: fontSize.xs,
    color: colors.accent,
    fontWeight: '600',
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
