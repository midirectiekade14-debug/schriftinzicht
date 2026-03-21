import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import { colors, fonts } from '../constants/theme';

const { width, height } = Dimensions.get('window');

interface LandingScreenProps {
  onComplete: () => void;
}

export default function LandingScreen({ onComplete }: LandingScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const textFade = useRef(new Animated.Value(0)).current;
  const subtextFade = useRef(new Animated.Value(0)).current;
  const subtitleFade = useRef(new Animated.Value(0)).current;
  const circleFade = useRef(new Animated.Value(0)).current;
  const circleScale = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(circleFade, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.spring(circleScale, { toValue: 1, friction: 6, tension: 30, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 900, delay: 150, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 7, tension: 35, useNativeDriver: true }),
      ]),
      Animated.timing(textFade, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(subtextFade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(subtitleFade, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(onComplete, 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Pressable style={styles.container} onPress={onComplete}>
      {/* Decoratieve cirkel */}
      <Animated.View
        style={[
          styles.circleOuter,
          { opacity: Animated.multiply(circleFade, new Animated.Value(0.07)), transform: [{ scale: circleScale }] },
        ]}
      />

      {/* Logo: kruis + bijbel + tekst */}
      <Animated.View style={[styles.logoWrapper, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>

        {/* ===== KRUIS ===== */}
        <View style={styles.crossContainer}>
          <View style={styles.crossVertical} />
          <View style={styles.crossHorizontal} />
          <View style={styles.crossDot} />
        </View>

        {/* ===== OPEN BIJBEL ===== */}
        <View style={styles.bookWrapper}>
          {/* Linker cover */}
          <View style={styles.coverLeft}>
            <View style={styles.pageLeft}>
              <View style={[styles.pageLine, { width: '65%' }]} />
              <View style={[styles.pageLine, { width: '80%' }]} />
              <View style={[styles.pageLine, { width: '55%' }]} />
              <View style={[styles.pageLine, { width: '75%' }]} />
              <View style={[styles.pageLine, { width: '60%' }]} />
            </View>
          </View>

          {/* Rugbinding */}
          <View style={styles.bookSpine} />

          {/* Rechter cover */}
          <View style={styles.coverRight}>
            <View style={styles.pageRight}>
              <View style={[styles.pageLine, { width: '65%' }]} />
              <View style={[styles.pageLine, { width: '80%' }]} />
              <View style={[styles.pageLine, { width: '55%' }]} />
              <View style={[styles.pageLine, { width: '75%' }]} />
              <View style={[styles.pageLine, { width: '60%' }]} />
            </View>
          </View>

          {/* Leeslint */}
          <View style={styles.bookmark} />
        </View>
      </Animated.View>

      {/* ===== APP NAAM ===== */}
      <View style={styles.brandContainer}>
        <Animated.View style={[styles.dividerTop, { opacity: textFade }]} />
        <Animated.Text style={[styles.brandMain, { opacity: textFade }]}>
          SCHRIFT
        </Animated.Text>
        <Animated.Text style={[styles.brandSub, { opacity: subtextFade }]}>
          INZICHT
        </Animated.Text>
        <Animated.View style={[styles.dividerBottom, { opacity: subtextFade }]} />
        <Animated.Text style={[styles.brandSubtitle, { opacity: subtitleFade }]}>
          Bijbelverklaringen van de Oudvaders
        </Animated.Text>
      </View>

      {/* Tik hint */}
      <Animated.Text style={[styles.tapHint, { opacity: subtitleFade }]}>
        tik om verder te gaan
      </Animated.Text>
    </Pressable>
  );
}

const CIRCLE_SIZE = Math.min(width, height) * 0.72;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  circleOuter: {
    position: 'absolute',
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 1,
    borderColor: colors.accent,
    top: height / 2 - CIRCLE_SIZE / 2 - 40,
  },

  logoWrapper: {
    alignItems: 'center',
    marginBottom: 28,
    marginTop: -30,
  },

  // ===== KRUIS =====
  crossContainer: {
    width: 60,
    height: 128,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 24,
  },
  crossVertical: {
    position: 'absolute',
    width: 4,
    height: 128,
    borderRadius: 2,
    backgroundColor: colors.accent,
    opacity: 0.9,
  },
  crossHorizontal: {
    position: 'absolute',
    width: 60,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
    opacity: 0.9,
    top: 32,
  },
  crossDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    opacity: 0.35,
    top: 30,
  },

  // ===== OPEN BIJBEL =====
  bookWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 88,
  },

  coverLeft: {
    width: 80,
    height: 86,
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 8,
    borderRightWidth: 0,
    backgroundColor: 'rgba(196,149,106,0.04)',
    overflow: 'hidden',
    transform: [{ skewY: '-2deg' }],
  },
  pageLeft: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 14,
    gap: 6,
    alignItems: 'flex-end',
  },

  coverRight: {
    width: 80,
    height: 86,
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 8,
    borderLeftWidth: 0,
    backgroundColor: 'rgba(196,149,106,0.04)',
    overflow: 'hidden',
    transform: [{ skewY: '2deg' }],
  },
  pageRight: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 14,
    gap: 6,
    alignItems: 'flex-start',
  },

  pageLine: {
    height: 1,
    backgroundColor: colors.accent,
    opacity: 0.15,
    borderRadius: 1,
  },

  bookSpine: {
    width: 4,
    height: 88,
    backgroundColor: colors.accent,
    opacity: 0.55,
    borderRadius: 2,
  },

  bookmark: {
    position: 'absolute',
    width: 3,
    height: 36,
    backgroundColor: '#8B3030',
    opacity: 0.45,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    right: 22,
    top: 0,
  },

  // ===== TEKST =====
  brandContainer: {
    alignItems: 'center',
  },
  dividerTop: {
    width: 200,
    height: 0.5,
    backgroundColor: colors.accent,
    opacity: 0.15,
    marginBottom: 14,
  },
  brandMain: {
    fontFamily: fonts.serifBold,
    fontSize: 32,
    letterSpacing: 10,
    color: colors.accent,
    marginBottom: 4,
    opacity: 0.9,
  },
  brandSub: {
    fontFamily: fonts.serif,
    fontSize: 23,
    letterSpacing: 14,
    color: colors.textSecondary,
    opacity: 0.5,
    marginBottom: 14,
  },
  dividerBottom: {
    width: 160,
    height: 0.5,
    backgroundColor: colors.accent,
    opacity: 0.12,
    marginBottom: 10,
  },
  brandSubtitle: {
    fontFamily: fonts.serifItalic,
    fontSize: 17,
    color: colors.textMuted,
    letterSpacing: 1,
    opacity: 0.6,
  },

  tapHint: {
    position: 'absolute',
    bottom: 48,
    fontFamily: fonts.sans,
    fontSize: 17,
    color: colors.textFaint,
    letterSpacing: 1.5,
  },
});
