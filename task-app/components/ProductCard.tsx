import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { router } from 'expo-router';
import { colors, fonts } from '@/lib/theme';
import { Product } from '@/lib/mockData';
import { useCart } from '@/lib/cartStore';
import QtyStepper from './QtyStepper';

export default function ProductCard({ product, width }: { product: Product; width: number }) {
  const items = useCart((s) => s.items);
  const add = useCart((s) => s.add);
  const remove = useCart((s) => s.remove);
  const qty = items[product.id] || 0;
  const off = Math.round(((product.mrp - product.price) / product.mrp) * 100);

  return (
    <Pressable
      style={[styles.card, { width }]}
      onPress={() => router.push({ pathname: '/product-details', params: { id: product.id } })}
    >
      <View style={styles.imageWrap}>
        <Image source={{ uri: product.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        {off > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{off}% OFF</Text>
          </View>
        ) : null}
        {!product.inStock ? (
          <View style={styles.oos}>
            <Text style={styles.oosText}>OUT OF STOCK</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{product.name}</Text>
        <Text style={styles.unit}>{product.unit}</Text>
        <View style={styles.bottom}>
          <View style={styles.price}>
            <Text style={styles.amount}>₹{product.price}</Text>
            {product.mrp > product.price ? <Text style={styles.mrp}>₹{product.mrp}</Text> : null}
          </View>
          {product.inStock ? (
            <QtyStepper qty={qty} onAdd={() => add(product.id)} onRemove={() => remove(product.id)} />
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: 0 },
  imageWrap: {
    height: 130, backgroundColor: colors.chipBg, overflow: 'hidden',
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  badge: { position: 'absolute', top: 0, left: 0, backgroundColor: colors.accent, paddingHorizontal: 5, paddingVertical: 2 },
  badgeText: { color: colors.accentForeground, fontSize: 9, fontFamily: fonts.bodyBold },
  oos: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' },
  oosText: { fontSize: 10, fontFamily: fonts.bodyBold, color: colors.danger },
  body: { padding: 8 },
  name: { fontSize: 13, fontFamily: fonts.heading, color: colors.foreground },
  unit: { fontSize: 11, color: colors.mutedForeground, fontFamily: fonts.body, marginTop: 2 },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  price: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  amount: { fontSize: 14, fontFamily: fonts.displayBold, color: colors.foreground },
  mrp: { fontSize: 11, color: colors.mutedForeground, textDecorationLine: 'line-through', fontFamily: fonts.body },
});

