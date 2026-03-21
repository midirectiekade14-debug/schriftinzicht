import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fonts } from '../constants/theme';

interface MenuItem {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  screen: string;
}

const MENU_ITEMS: MenuItem[] = [
  {
    title: 'Heidelbergse Catechismus',
    subtitle: '52 Zondagen · 129 vragen en antwoorden',
    icon: 'school-outline',
    screen: 'Catechismus',
  },
  {
    title: 'Preekvoorbereiding',
    subtitle: 'Alle verklaringen, belijdenissen en kruisverwijzingen bij uw tekst',
    icon: 'easel-outline',
    screen: 'PreekVoorbereiding',
  },
  {
    title: 'Instellingen',
    subtitle: 'Weergave, bronnen en over de app',
    icon: 'settings-outline',
    screen: 'Instellingen',
  },
];

export default function MeerScreen() {
  const navigation = useNavigation<any>();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.label}>SCHRIFTINZICHT</Text>
        <Text style={styles.title}>Meer</Text>
        <Text style={styles.subtitle}>Belijdenisgeschriften, instellingen en meer</Text>
      </View>

      {MENU_ITEMS.map((item) => (
        <TouchableOpacity
          key={item.screen}
          style={styles.menuItem}
          activeOpacity={0.7}
          onPress={() => navigation.navigate(item.screen)}
        >
          <View style={styles.iconContainer}>
            <Ionicons name={item.icon} size={22} color={colors.accent} />
          </View>
          <View style={styles.menuText}>
            <Text style={styles.menuTitle}>{item.title}</Text>
            <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
        </TouchableOpacity>
      ))}

      <View style={styles.footer}>
        <Text style={styles.footerText}>SchriftInzicht v0.2.0</Text>
        <Text style={styles.footerNote}>Alle bronnen zijn publiek domein</Text>
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
    paddingTop: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: 15,
    letterSpacing: 2,
    color: colors.textFaint,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '600',
    color: colors.accent,
    fontFamily: fonts.serifBold,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md + 2,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  menuText: {
    flex: 1,
  },
  menuTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  menuSubtitle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.xl * 2,
    paddingBottom: spacing.xl,
  },
  footerText: {
    fontSize: fontSize.xs,
    color: colors.textFaint,
  },
  footerNote: {
    fontSize: fontSize.xs,
    color: colors.textFaint,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
});
