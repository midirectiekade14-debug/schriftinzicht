// Dark theme matching SchriftInzicht prototype design
export const colors = {
  background: '#0C0A09',
  bgWarm: '#110E0C',
  surface: '#1A1714',
  card: '#151210',
  text: '#E7E1D8',
  textSecondary: '#D4CBC0',
  textMuted: '#8A7E72',
  textFaint: '#6B5F53',
  accent: '#C4956A',
  accentDim: '#A07850',
  accentLight: 'rgba(196,149,106,0.15)',
  border: 'rgba(231,225,216,0.08)',
  borderLight: 'rgba(231,225,216,0.04)',
  surfaceActive: 'rgba(196,149,106,0.06)',
  surfaceActiveBorder: 'rgba(196,149,106,0.18)',
  divider: 'rgba(196,149,106,0.1)',
  otBadge: '#6B8E6B',
  ntBadge: '#8B6B8E',
  white: '#FFFFFF',
  error: '#E74C3C',
  skeleton: '#2A2420',
  tagBg: 'rgba(196,149,106,0.08)',
  tagBorder: 'rgba(196,149,106,0.15)',
  eras: {
    Reformatie: '#D4A574',
    'Nadere Reformatie': '#8BB89E',
    'Puriteinse periode': '#7BA8C8',
    '19e eeuw': '#C8A870',
  } as Record<string, string>,
};

export const fonts = {
  serif: 'CormorantGaramond_400Regular',
  serifItalic: 'CormorantGaramond_400Regular_Italic',
  serifBold: 'CormorantGaramond_700Bold',
  sans: 'LibreFranklin_400Regular',
  sansSemiBold: 'LibreFranklin_600SemiBold',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const fontSize = {
  xs: 16,
  sm: 16,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 30,
};
