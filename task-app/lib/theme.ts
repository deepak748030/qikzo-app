// Qizko — on-demand delivery/ride booking customer app theme.
// "Black & Gold Elegance" palette: deep navy + warm gold accent on clean white.
// Reference palette: #FFFFFF, #E5E5E5, #FCA311, #14213D, #000000

export const colors = {
  primary: '#14213D',          // deep navy — primary surfaces, buttons, brand
  primaryDark: '#004643',
  primaryForeground: '#FFFFFF',
  accent: '#FCA311',           // warm gold — highlights, active pins, CTAs
  accentForeground: '#14213D',
  background: '#FFFFFF',
  card: '#FFFFFF',
  foreground: '#14213D',       // primary text
  mutedForeground: '#6B7280',
  border: '#E5E5E5',
  divider: '#ECECEC',
  success: '#16A34A',
  danger: '#DC2626',
  warning: '#FCA311',
  inputBg: '#FFFFFF',
  inputBorder: '#D8D8D8',
  chipBg: '#F4F4F5',
  // legacy keys kept for backward compatibility with any remaining screens
  green: '#16A34A',
  red: '#DC2626',
  purple: '#14213D',
  orange: '#FCA311',
};

// Small, professional border radii (max 4) — soft edges, not bubbly boxes.
export const radius = {
  sm: 2,
  md: 3,
  lg: 4,
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
