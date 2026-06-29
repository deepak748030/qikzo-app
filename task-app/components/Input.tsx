import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { colors, fonts, radius } from '@/lib/theme';

type Props = TextInputProps & {
  label?: string;
  prefix?: string;
};

// Rounded outlined input — matches the reference's pill receipt-number field.
export default function Input({ label, prefix, style, ...rest }: Props) {
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.box}>
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, style]}
          {...rest}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  label: { fontSize: 12, color: colors.mutedForeground, marginBottom: 6, fontFamily: fonts.bodyBold },
  box: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: colors.inputBorder, backgroundColor: colors.inputBg,
    paddingHorizontal: 14, borderRadius: radius.sm, minHeight: 46,
  },
  prefix: { fontSize: 14, color: colors.foreground, fontFamily: fonts.bodyBold, marginRight: 6 },
  input: { flex: 1, paddingVertical: 10, fontSize: 14, color: colors.foreground, fontFamily: fonts.body },
});
