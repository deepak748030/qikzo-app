import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, fonts } from '@/lib/theme';
import ScreenHeader from '@/components/ScreenHeader';
import ProductRow from '@/components/ProductRow';
import Button from '@/components/Button';
import { useCart } from '@/lib/cartStore';

const DELIVERY = 25;

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const lines = useCart((s) => s.lines());
  const subtotal = useCart((s) => s.subtotal());
  const savings = useCart((s) => s.savings());
  const delivery = subtotal >= 199 || subtotal === 0 ? 0 : DELIVERY;
  const total = subtotal + delivery;

  if (lines.length === 0) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="My Cart" showBack={false} />
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🛒</Text>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySub}>Add fresh groceries to get started.</Text>
          <Button label="Browse products" onPress={() => router.push('/(tabs)')} style={{ marginTop: 16, paddingHorizontal: 20 }} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="My Cart" showBack={false} />
      <FlatList
        data={lines}
        keyExtractor={(l) => l.product.id}
        renderItem={({ item }) => <ProductRow product={item.product} />}
        ItemSeparatorComponent={() => <View style={{ height: 0 }} />}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          <View style={styles.bill}>
            <Text style={styles.billTitle}>Bill details</Text>
            <Row label="Item total" value={`₹${subtotal}`} />
            <Row label="Delivery fee" value={delivery === 0 ? 'FREE' : `₹${delivery}`} />
            {savings > 0 ? <Row label="Your savings" value={`-₹${savings}`} accent /> : null}
            <View style={styles.divider} />
            <Row label="To pay" value={`₹${total}`} bold />
          </View>
        }
        contentContainerStyle={{ paddingBottom: 20 }}
      />
      <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}>
        <View>
          <Text style={styles.footTotal}>₹{total}</Text>
          <Text style={styles.footSub}>{lines.length} item{lines.length > 1 ? 's' : ''}</Text>
        </View>
        <Button label="Proceed to checkout" onPress={() => router.push('/checkout')} style={styles.checkoutBtn} />
      </View>
    </View>
  );
}

function Row({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: boolean }) {
  return (
    <View style={styles.billRow}>
      <Text style={[styles.billLabel, bold && styles.billBold]}>{label}</Text>
      <Text style={[styles.billValue, bold && styles.billBold, accent && { color: colors.success }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyEmoji: { fontSize: 50 },
  emptyTitle: { fontSize: 18, fontFamily: fonts.displayBold, color: colors.foreground, marginTop: 12 },
  emptySub: { fontSize: 13, color: colors.mutedForeground, fontFamily: fonts.body, marginTop: 4 },
  bill: { marginHorizontal: 6, marginTop: 10, borderWidth: 1, borderColor: colors.border, padding: 10, borderRadius: 0 },
  billTitle: { fontSize: 14, fontFamily: fonts.heading, color: colors.foreground, marginBottom: 8 },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  billLabel: { fontSize: 13, color: colors.mutedForeground, fontFamily: fonts.body },
  billValue: { fontSize: 13, color: colors.foreground, fontFamily: fonts.bodyBold },
  billBold: { color: colors.foreground, fontFamily: fonts.displayBold, fontSize: 15 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 6 },
  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6, paddingTop: 8,
    borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card,
  },
  footTotal: { fontSize: 18, fontFamily: fonts.displayBold, color: colors.foreground },
  footSub: { fontSize: 11, color: colors.mutedForeground, fontFamily: fonts.body },
  checkoutBtn: { flex: 1, marginLeft: 12 },
});
