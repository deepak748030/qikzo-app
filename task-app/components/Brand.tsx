import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, radius } from '@/lib/theme';

export default function Brand({ size = 30 }: { size?: number }) {
  return (
    <View style={styles.row}>
      <View style={[styles.mark, { width: size, height: size }]}>
        <Text style={[styles.markText, { fontSize: size * 0.6 }]}>Q</Text>
        <View style={styles.dot} />
      </View>
      <Text style={[styles.word, { fontSize: size * 0.78 }]}>Qikzo</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mark: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  markText: { color: colors.primaryForeground, fontFamily: fonts.displayBold },
  dot: { position: 'absolute', top: 5, right: 5, width: 5, height: 5, backgroundColor: colors.accent, borderRadius: radius.sm },
  word: { color: colors.foreground, fontFamily: fonts.displayBold, letterSpacing: -0.5 },
});
