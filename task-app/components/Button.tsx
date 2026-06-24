import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle, StyleProp } from 'react-native';
import { colors, fonts } from '@/lib/theme';

type Props = {
  label: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'solid' | 'outline';
  style?: StyleProp<ViewStyle>;
};

// Strict rule: when pressed/working, show spinner instead of text. Radius 0.
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
        pressed && { opacity: 0.85 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isOutline ? colors.foreground : colors.primaryForeground} size="small" />
      ) : (
        <Text style={[styles.label, isOutline ? styles.outlineLabel : styles.solidLabel]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 0 },
  solid: { backgroundColor: colors.primary },
  outline: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.foreground },
  disabled: { opacity: 0.5 },
  label: { fontSize: 14, fontFamily: fonts.bodyBold },
  solidLabel: { color: colors.primaryForeground },
  outlineLabel: { color: colors.foreground },
});
