// Qikzo — on-demand delivery/ride booking customer app theme.
// Palette locked to the reference swatches:
//   • Cyprus  #004643 — primary brand (headers, CTAs, active surfaces)
//   • Sand Dune #F0EDE5 — canvas / header band / muted surface
// Single source of truth — every screen reads colors from here.
export const colors = {
  primary: '#004643',          // Cyprus — brand deep teal
  primaryDark: '#00302E',      // pressed
  primaryForeground: '#F0EDE5',
  accent: '#E5B769',           // warm gold accent (from Cyprus palette family)
  accentForeground: '#004643',
  background: '#F6F3EC',       // slightly lifted Sand Dune canvas
  headerBg: '#F0EDE5',         // exact Sand Dune — used on every screen header
  card: '#FFFFFF',
  foreground: '#0F2A28',       // near-Cyprus ink for body text
  mutedForeground: '#6B7E7C',  // muted teal-gray
  border: '#DED6C6',           // sand border (visible on Sand Dune + white)
  divider: '#E6DFCF',
  success: '#2F7D6B',
  danger: '#C0392B',
  warning: '#C78A2E',
  // Sand-tinted input surface so fields don't look like flat white on the canvas
  inputBg: '#FAF7EF',
  inputBorder: '#CFC3A6',
  chipBg: '#F0EDE5',
  // Rich footer surface for the bottom tab bar
  surfaceDark: '#003330',
  surfaceDarkBorder: '#00504C',
  // legacy keys retained for compatibility
  green: '#004643',
  red: '#C0392B',
  purple: '#0F2A28',
  orange: '#E5B769',
};

// Rounded radii matching the reference mockups (soft cards, pill CTAs).
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
