import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { colors, fonts } from '@/lib/theme';
import { Product } from '@/lib/mockData';
import { useCart } from '@/lib/cartStore';
import QtyStepper from './QtyStepper';

// Row used in feeds/lists — separated by a single hairline (no vertical gaps).
export default function ProductRow({ product }: { product: Product }) {
  const items = useCart((s) => s.items);
  const add = useCart((s) => s.add);
  const remove = useCart((s) => s.remove);
  const qty = items[product.id] || 0;

  return (
    <Pressable
      style={styles.row}
      onPress={() => router.push({ pathname: '/product-details', params: { id: product.id } })}
    >
      <View style={styles.thumb}>
        <Text style={styles.emoji}>{product.emoji}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{product.name}</Text>
        <Text style={styles.unit}>{product.unit}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.amount}>₹{product.price}</Text>
          {product.mrp > product.price ? <Text style={styles.mrp}>₹{product.mrp}</Text> : null}
        </View>
      </View>
      {product.inStock ? (
        <QtyStepper qty={qty} onAdd={() => add(product.id)} onRemove={() => remove(product.id)} />
      ) : (
        <Text style={styles.oos}>Out of{'\n'}stock</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 6,
    borderBottomWidth: 1, borderBottomColor: colors.divider, backgroundColor: colors.card,
  },
  thumb: {
    width: 52, height: 52, backgroundColor: colors.chipBg, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border, borderRadius: 0,
  },
  emoji: { fontSize: 28 },
  info: { flex: 1, marginLeft: 10 },
  name: { fontSize: 14, fontFamily: fonts.heading, color: colors.foreground },
  unit: { fontSize: 11, color: colors.mutedForeground, fontFamily: fonts.body, marginTop: 1 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5, marginTop: 3 },
  amount: { fontSize: 14, fontFamily: fonts.displayBold, color: colors.foreground },
  mrp: { fontSize: 11, color: colors.mutedForeground, textDecorationLine: 'line-through', fontFamily: fonts.body },
  oos: { fontSize: 10, color: colors.danger, fontFamily: fonts.bodyBold, textAlign: 'center' },
});
