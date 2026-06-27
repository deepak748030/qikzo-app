// Qikzo — on-demand delivery/ride booking customer app theme.
// Palette: deep teal #004643 + warm gold accent on clean white.
// Single source of truth — every screen reads colors from here.

export const colors = {
  primary: '#004643',          // deep teal — primary surfaces, buttons, brand
  primaryDark: '#00302E',      // pressed/elevated teal
  primaryForeground: '#FFFFFF',
  accent: '#FCA311',           // warm gold — highlights, active pins, CTAs
  accentForeground: '#004643',
  background: '#FFFFFF',
  card: '#FFFFFF',
  foreground: '#004643',       // primary text — teal, not black
  mutedForeground: '#5C7472',  // muted teal-grey for secondary text
  border: '#D8E2E1',           // soft teal-tinted border so white cards on white bg are visible
  divider: '#E6ECEB',
  success: '#16A34A',
  danger: '#DC2626',
  warning: '#FCA311',
  inputBg: '#FFFFFF',
  inputBorder: '#B9C8C7',      // teal-tinted input outline
  chipBg: '#F1F5F4',
  // legacy keys kept for backward compatibility with any remaining screens
  green: '#16A34A',
  red: '#DC2626',
  purple: '#004643',
  orange: '#FCA311',
};

// Tight, professional border radii (max 3) — soft edges, never bubbly.
export const radius = {
  sm: 1,
  md: 2,
  lg: 3,
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
