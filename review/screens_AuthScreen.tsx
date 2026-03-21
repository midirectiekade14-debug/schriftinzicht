import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { colors, spacing, fontSize, fonts } from '../constants/theme';

interface AuthScreenProps {
  onSkip: () => void;
}

function BrandLogo() {
  return (
    <View style={logoStyles.wrapper}>
      {/* Mini cross */}
      <View style={logoStyles.crossContainer}>
        <View style={logoStyles.crossV} />
        <View style={logoStyles.crossH} />
      </View>
      {/* Divider */}
      <View style={logoStyles.divider} />
      {/* Brand text */}
      <Text style={logoStyles.main}>SCHRIFT</Text>
      <Text style={logoStyles.sub}>INZICHT</Text>
    </View>
  );
}

const logoStyles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  crossContainer: {
    width: 28,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  crossV: {
    position: 'absolute',
    width: 3,
    height: 48,
    borderRadius: 1.5,
    backgroundColor: colors.accent,
  },
  crossH: {
    position: 'absolute',
    width: 28,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.accent,
    top: 14,
  },
  divider: {
    width: 100,
    height: 0.5,
    backgroundColor: colors.accent,
    opacity: 0.25,
    marginBottom: 10,
  },
  main: {
    fontFamily: fonts.serifBold,
    fontSize: 22,
    letterSpacing: 7,
    color: colors.accent,
    marginBottom: 2,
  },
  sub: {
    fontFamily: fonts.serif,
    fontSize: 14,
    letterSpacing: 9,
    color: colors.textSecondary,
    opacity: 0.5,
  },
});

export default function AuthScreen({ onSkip }: AuthScreenProps) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Vul e-mail en wachtwoord in.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    if (mode === 'login') {
      const { error } = await signIn(email.trim(), password);
      if (error) setError(error);
    } else {
      const { error } = await signUp(email.trim(), password);
      if (error) {
        setError(error);
      } else {
        setSuccessMsg('Account aangemaakt! Controleer je e-mail om te bevestigen.');
      }
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <BrandLogo />
          <Text style={styles.title}>
            {mode === 'login' ? 'Welkom terug' : 'Account aanmaken'}
          </Text>
          <Text style={styles.subtitle}>
            Bewaar bladwijzers en zoekgeschiedenis
          </Text>
        </View>

        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, mode === 'login' && styles.tabActive]}
            onPress={() => { setMode('login'); setError(null); setSuccessMsg(null); }}
          >
            <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>Inloggen</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, mode === 'register' && styles.tabActive]}
            onPress={() => { setMode('register'); setError(null); setSuccessMsg(null); }}
          >
            <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>Registreren</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="E-mailadres"
            placeholderTextColor={colors.textFaint}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={styles.input}
            placeholder="Wachtwoord"
            placeholderTextColor={colors.textFaint}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {successMsg && (
            <View style={styles.successBox}>
              <Text style={styles.successText}>{successMsg}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              <Text style={styles.submitText}>
                {mode === 'login' ? 'Inloggen' : 'Registreren'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.skipBtn} onPress={onSkip}>
          <Text style={styles.skipText}>Doorgaan zonder account</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl * 2,
    paddingBottom: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSize.xxl,
    color: colors.text,
    fontFamily: fonts.serifBold,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    fontFamily: fonts.sans,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: colors.accent,
  },
  tabText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontFamily: fonts.sansSemiBold,
  },
  tabTextActive: {
    color: colors.background,
  },
  form: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    fontSize: fontSize.md,
    color: colors.text,
    fontFamily: fonts.sans,
    borderWidth: 1,
    borderColor: colors.border,
  },
  errorBox: {
    backgroundColor: 'rgba(231,76,60,0.1)',
    borderRadius: 10,
    padding: spacing.sm + 2,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  errorText: {
    color: colors.error,
    fontSize: fontSize.sm,
    fontFamily: fonts.sans,
  },
  successBox: {
    backgroundColor: 'rgba(100,200,100,0.1)',
    borderRadius: 10,
    padding: spacing.sm + 2,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  successText: {
    color: '#4CAF50',
    fontSize: fontSize.sm,
    fontFamily: fonts.sans,
  },
  submitBtn: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: colors.background,
    fontSize: fontSize.md,
    fontFamily: fonts.sansSemiBold,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  skipText: {
    color: colors.textFaint,
    fontSize: fontSize.sm,
    fontFamily: fonts.sans,
    textDecorationLine: 'underline',
  },
});
