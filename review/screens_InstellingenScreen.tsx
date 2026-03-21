import React from 'react';
import { View, Text, StyleSheet, ScrollView, Linking, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize } from '../constants/theme';

export default function InstellingenScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Weergave</Text>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Thema</Text>
          <Text style={styles.settingValue}>Donker (standaard)</Text>
        </View>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Lettergrootte</Text>
          <Text style={styles.settingValue}>Normaal</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Over SchriftInzicht</Text>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Versie</Text>
          <Text style={styles.settingValue}>0.2.0</Text>
        </View>
        <Text style={styles.aboutText}>
          SchriftInzicht brengt bijbelverklaringen van de oudvaders samen op
          één plek. Doorzoek verklaringen van Matthew Henry, de Statenvertaling
          met kanttekeningen, Dächsel en meer — gesorteerd per vers in een
          vergelijkende tijdlijn.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bronnen</Text>
        {[
          'Statenvertaling met Kanttekeningen (1637)',
          'Matthew Henry — Bijbelverklaring (1706)',
          'Dächsel — Bijbelverklaring (1870)',
          'Heidelbergse Catechismus (1563)',
          'Nederlandse Geloofsbelijdenis (1561)',
          'Dordtse Leerregels (1619)',
        ].map((source) => (
          <View key={source} style={styles.sourceRow}>
            <Ionicons name="document-text-outline" size={14} color={colors.textFaint} />
            <Text style={styles.sourceText}>{source}</Text>
          </View>
        ))}
        <Text style={styles.pdNote}>
          Alle bronnen zijn publiek domein.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact</Text>
        <TouchableOpacity
          style={styles.contactRow}
          onPress={() => Linking.openURL('mailto:info@schriftinzicht.nl')}
        >
          <Ionicons name="mail-outline" size={16} color={colors.accent} />
          <Text style={styles.link}>info@schriftinzicht.nl</Text>
        </TouchableOpacity>
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
    padding: spacing.md,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  settingLabel: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  settingValue: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  aboutText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs + 2,
  },
  sourceText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  pdNote: {
    fontSize: fontSize.xs,
    color: colors.textFaint,
    fontStyle: 'italic',
    marginTop: spacing.sm,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  link: {
    fontSize: fontSize.md,
    color: colors.accent,
  },
});
