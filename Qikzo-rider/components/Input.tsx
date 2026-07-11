import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps, Platform } from 'react-native';
import { colors, fonts, radius } from '@/lib/theme';

type Props = TextInputProps & {
  label?: string;
  prefix?: string;
};

// Rounded outlined input — matches the reference's pill receipt-number field.
export default function Input({ label, prefix, style, multiline, ...rest }: Props) {
  const androidTextInputProps: any = Platform.OS === 'android' ? { includeFontPadding: false } : {};

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.box, multiline && styles.boxMultiline]}>
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          placeholderTextColor={colors.mutedForeground}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          {...androidTextInputProps}
          style={[styles.input, multiline && styles.inputMultiline, style]}
          {...rest}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  label: { fontSize: 12, color: colors.mutedForeground, marginBottom: 6, fontFamily: fonts.bodyBold },
  // Single-line box vertically centers its children so prefix + placeholder + value all sit on the same line.
  box: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: colors.inputBorder, backgroundColor: colors.inputBg,
    paddingHorizontal: 14, borderRadius: radius.sm, height: 46,
  },
  boxMultiline: { height: undefined, minHeight: 46, alignItems: 'flex-start', paddingVertical: 8 },
  prefix: {
    fontSize: 14, color: colors.foreground, fontFamily: fonts.bodyBold,
    marginRight: 8, lineHeight: 18,
    ...Platform.select({ android: { includeFontPadding: false } as any, default: {} }),
  },
  input: {
    flex: 1, fontSize: 14, color: colors.foreground, fontFamily: fonts.body,
    // No vertical padding — the fixed-height row handles centering.
    paddingVertical: 0, paddingTop: 0, paddingBottom: 0,
    height: '100%',
    lineHeight: 18,
  },
  inputMultiline: { height: undefined, minHeight: 70, lineHeight: 20, paddingTop: 2 },
});
