import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle, StyleProp } from 'react-native';
import { colors, fonts, radius } from '@/lib/theme';

type Props = {
  label: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'solid' | 'outline';
  style?: StyleProp<ViewStyle>;
};

// Pill CTA matching the reference's "Calculate" button — full-width, orange, rounded.
export default function Button({ label, onPress, loading, disabled, variant = 'solid', style }: Props) {
  const isOutline = variant === 'outline';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        isOutline ? styles.outline : styles.solid,
        (disabled || loading) && styles.disabled,
        pressed && { opacity: 0.9 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isOutline ? colors.foreground : colors.accentForeground} size="small" />
      ) : (
        <Text style={[styles.label, isOutline ? styles.outlineLabel : styles.solidLabel]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, paddingHorizontal: 20 },
  solid: { backgroundColor: colors.accent },
  outline: { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.foreground },
  disabled: { opacity: 0.5 },
  label: { fontSize: 15, fontFamily: fonts.bodyBold, letterSpacing: 0.3 },
  solidLabel: { color: colors.accentForeground },
  outlineLabel: { color: colors.foreground },
});
