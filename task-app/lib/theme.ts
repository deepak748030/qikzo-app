// Qizko — grocery booking customer app theme.
// Minimal black & white aesthetic with a single warm accent (inspired by reference UI kit).

export const colors = {
  primary: '#111111',
  primaryDark: '#000000',
  primaryForeground: '#FFFFFF',
  accent: '#F97316',
  accentForeground: '#FFFFFF',
  background: '#FFFFFF',
  card: '#FFFFFF',
  foreground: '#111111',
  mutedForeground: '#6B7280',
  border: '#E5E7EB',
  divider: '#EFEFEF',
  success: '#16A34A',
  danger: '#DC2626',
  warning: '#D97706',
  inputBg: '#FFFFFF',
  inputBorder: '#D1D5DB',
  chipBg: '#F4F4F5',
  // legacy keys kept for backward compatibility with any remaining screens
  green: '#16A34A',
  red: '#DC2626',
  purple: '#111111',
  orange: '#F97316',
};

// Strict rule: border radius is 0 everywhere.
export const radius = {
  sm: 0,
  md: 0,
  lg: 0,
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
