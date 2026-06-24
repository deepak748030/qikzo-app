import React from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, fonts } from '@/lib/theme';
import ScreenHeader from '@/components/ScreenHeader';
import QtyStepper from '@/components/QtyStepper';
import Button from '@/components/Button';
import { getProductById } from '@/lib/mockData';
import { useCart } from '@/lib/cartStore';

export default function ProductDetails() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const product = getProductById(id);
  const items = useCart((s) => s.items);
  const add = useCart((s) => s.add);
  const remove = useCart((s) => s.remove);

  if (!product) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Product" />
        <Text style={styles.missing}>Product not found.</Text>
      </View>
    );
  }

  const qty = items[product.id] || 0;
  const off = Math.round(((product.mrp - product.price) / product.mrp) * 100);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Product details" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Image strikes to the left & right edges of the screen */}
        <View style={[styles.hero, { width, height: width * 0.7 }]}>
          {off > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{off}% OFF</Text></View> : null}
          <Text style={styles.heroEmoji}>{product.emoji}</Text>
        </View>

        <View style={styles.body}>
          <Text style={styles.name}>{product.name}</Text>
          <Text style={styles.unit}>{product.unit}</Text>

          <View style={styles.priceRow}>
            <Text style={styles.price}>₹{product.price}</Text>
            {product.mrp > product.price ? <Text style={styles.mrp}>₹{product.mrp}</Text> : null}
            {product.inStock ? (
              <Text style={[styles.stock, { color: colors.success }]}>In stock</Text>
            ) : (
              <Text style={[styles.stock, { color: colors.danger }]}>Out of stock</Text>
            )}
          </View>

          <View style={styles.divider} />

          <Text style={styles.heading}>About this product</Text>
          <Text style={styles.desc}>
            Hand-picked {product.name.toLowerCase()} sourced fresh daily and quality-checked before delivery.
            Packed hygienically to keep it fresh until it reaches your doorstep.
          </Text>

          <View style={styles.metaRow}>
            <Meta label="Quantity" value={product.unit} />
            <Meta label="Delivery" value="Within 30 min" />
            <Meta label="Return" value="Easy returns" />
          </View>
        </View>
      </ScrollView>

      {product.inStock ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}>
          <QtyStepper qty={qty} onAdd={() => add(product.id)} onRemove={() => remove(product.id)} size="md" />
          <Button
            label={qty > 0 ? 'Go to cart' : 'Add to cart'}
            onPress={() => (qty > 0 ? router.push('/(tabs)/cart') : add(product.id))}
            style={styles.cta}
          />
        </View>
      ) : null}
    </View>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.meta}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  missing: { padding: 6, fontFamily: fonts.body, color: colors.mutedForeground },
  hero: { backgroundColor: colors.chipBg, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: colors.border },
  heroEmoji: { fontSize: 120 },
  badge: { position: 'absolute', top: 0, left: 0, backgroundColor: colors.accent, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { color: colors.accentForeground, fontSize: 11, fontFamily: fonts.bodyBold },
  body: { paddingHorizontal: 6, paddingTop: 12 },
  name: { fontSize: 22, fontFamily: fonts.displayBold, color: colors.foreground },
  unit: { fontSize: 13, color: colors.mutedForeground, fontFamily: fonts.body, marginTop: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 10 },
  price: { fontSize: 24, fontFamily: fonts.displayBold, color: colors.foreground },
  mrp: { fontSize: 15, color: colors.mutedForeground, textDecorationLine: 'line-through', fontFamily: fonts.body },
  stock: { fontSize: 12, fontFamily: fonts.bodyBold, marginLeft: 'auto' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  heading: { fontSize: 15, fontFamily: fonts.heading, color: colors.foreground, marginBottom: 6 },
  desc: { fontSize: 13, color: colors.mutedForeground, fontFamily: fonts.body, lineHeight: 20 },
  metaRow: { flexDirection: 'row', gap: 6, marginTop: 14 },
  meta: { flex: 1, borderWidth: 1, borderColor: colors.border, padding: 8, borderRadius: 0 },
  metaLabel: { fontSize: 10, color: colors.mutedForeground, fontFamily: fonts.body },
  metaValue: { fontSize: 12, color: colors.foreground, fontFamily: fonts.bodyBold, marginTop: 3 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card },
  cta: { flex: 1 },
});
