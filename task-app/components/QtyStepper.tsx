import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { colors, fonts } from '@/lib/theme';

type Props = {
  qty: number;
  onAdd: () => void;
  onRemove: () => void;
  size?: 'sm' | 'md';
};

export default function QtyStepper({ qty, onAdd, onRemove, size = 'sm' }: Props) {
  const h = size === 'sm' ? 30 : 38;
  if (qty <= 0) {
    return (
      <Pressable style={[styles.addBtn, { height: h }]} onPress={onAdd} hitSlop={6}>
        <Text style={styles.addText}>ADD</Text>
      </Pressable>
    );
  }
  return (
    <View style={[styles.stepper, { height: h }]}>
      <Pressable style={styles.step} onPress={onRemove} hitSlop={6}>
        <Minus size={14} color={colors.primaryForeground} strokeWidth={3} />
      </Pressable>
      <Text style={styles.qty}>{qty}</Text>
      <Pressable style={styles.step} onPress={onAdd} hitSlop={6}>
        <Plus size={14} color={colors.primaryForeground} strokeWidth={3} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  addBtn: {
    minWidth: 64, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.foreground,
    alignItems: 'center', justifyContent: 'center', borderRadius: 0, backgroundColor: colors.card,
  },
  addText: { fontSize: 12, fontFamily: fonts.bodyBold, color: colors.foreground, letterSpacing: 0.5 },
  stepper: {
    minWidth: 84, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.primary, borderRadius: 0, paddingHorizontal: 4,
  },
  step: { width: 26, height: '100%', alignItems: 'center', justifyContent: 'center' },
  qty: { color: colors.primaryForeground, fontFamily: fonts.bodyBold, fontSize: 13, minWidth: 16, textAlign: 'center' },
});
