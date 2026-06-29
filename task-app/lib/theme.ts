// Qikzo — on-demand delivery/ride booking customer app theme.
// Palette: deep teal #004643 + warm gold accent on clean white.
// Single source of truth — every screen reads colors from here.

// Palette derived from reference mockups: soft peach/cream canvas,
// fresh leaf-green primary, warm orange CTA accent, deep navy text.
export const colors = {
  primary: '#7CB342',          // leaf green — primary cards, active states, brand
  primaryDark: '#5A8F2A',      // pressed green
  primaryForeground: '#FFFFFF',
  accent: '#FF6B1A',           // warm orange — CTAs, highlights, status
  accentForeground: '#FFFFFF',
  background: '#FCEFE0',       // soft peach canvas
  card: '#FFFFFF',
  foreground: '#1A2138',       // deep navy text
  mutedForeground: '#6B7280',  // muted slate
  border: '#EADBC8',           // warm sand border (visible on peach + white)
  divider: '#EFE3D2',
  success: '#7CB342',
  danger: '#E53935',
  warning: '#FF6B1A',
  inputBg: '#FFFFFF',
  inputBorder: '#E0D2BE',
  chipBg: '#FFF4E6',
  // legacy keys
  green: '#7CB342',
  red: '#E53935',
  purple: '#1A2138',
  orange: '#FF6B1A',
};

// Rounded radii matching the reference mockups (soft, friendly cards & pill buttons).
export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  pill: 999,
};

// Strict rule: horizontal padding is always 6; vertical gaps are small (6).
export const spacing = {
  hPad: 6,
  gap: 6,
};

export const fonts = {
  display: 'Sora_700Bold',
  displayBold: 'Sora_800ExtraBold',
  heading: 'Sora_600SemiBold',
  body: 'Manrope_500Medium',
  bodyBold: 'Manrope_700Bold',
  bodyRegular: 'Manrope_400Regular',
};
