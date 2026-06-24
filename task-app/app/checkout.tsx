import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MapPin, CreditCard, Wallet, Banknote, Check } from 'lucide-react-native';
import { colors, fonts } from '@/lib/theme';
import ScreenHeader from '@/components/ScreenHeader';
import Input from '@/components/Input';
import Button from '@/components/Button';
import BottomSheet from '@/components/BottomSheet';
import { useSheet } from '@/lib/useSheet';
import { useCart } from '@/lib/cartStore';

const PAYMENTS = [
  { id: 'cod', label: 'Cash on delivery', icon: Banknote },
  { id: 'upi', label: 'UPI', icon: Wallet },
  { id: 'card', label: 'Credit / Debit card', icon: CreditCard },
];

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const subtotal = useCart((s) => s.subtotal());
  const clear = useCart((s) => s.clear);
  const sheet = useSheet();

  const [address, setAddress] = useState('');
  const [pay, setPay] = useState('cod');
  const [loading, setLoading] = useState(false);

  const delivery = subtotal >= 199 ? 0 : 25;
  const total = subtotal + delivery;

  const placeOrder = () => {
    if (address.trim().length < 8) {
      sheet.show({ variant: 'error', title: 'Address required', message: 'Please enter a complete delivery address.' });
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      clear();
      router.replace({ pathname: '/order-success', params: { total: String(total) } });
    }, 900);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Checkout" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <View style={styles.secHead}>
            <MapPin size={16} color={colors.foreground} />
            <Text style={styles.secTitle}>Delivery address</Text>
          </View>
          <Input
            placeholder="House no, street, area, city, pincode"
            value={address}
            onChangeText={setAddress}
            multiline
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.secTitle}>Payment method</Text>
          <View style={{ marginTop: 8, gap: 6 }}>
            {PAYMENTS.map((p) => {
              const active = pay === p.id;
              return (
                <Pressable key={p.id} style={[styles.payRow, active && styles.payActive]} onPress={() => setPay(p.id)}>
                  <p.icon size={18} color={colors.foreground} />
                  <Text style={styles.payLabel}>{p.label}</Text>
                  {active ? <Check size={18} color={colors.foreground} /> : <View style={styles.radio} />}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.secTitle}>Order summary</Text>
          <Row label="Item total" value={`₹${subtotal}`} />
          <Row label="Delivery fee" value={delivery === 0 ? 'FREE' : `₹${delivery}`} />
          <View style={styles.divider} />
          <Row label="To pay" value={`₹${total}`} bold />
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}>
        <View>
          <Text style={styles.footTotal}>₹{total}</Text>
          <Text style={styles.footSub}>Total payable</Text>
        </View>
        <Button label="Place order" loading={loading} onPress={placeOrder} style={styles.placeBtn} />
      </View>

      <BottomSheet visible={sheet.visible} {...sheet.config} onClose={sheet.hide} />
    </View>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && styles.rowBold]}>{label}</Text>
      <Text style={[styles.rowValue, bold && styles.rowBold]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  section: { paddingHorizontal: 6, paddingTop: 12, borderBottomWidth: 1, borderBottomColor: colors.divider, paddingBottom: 12 },
  secHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  secTitle: { fontSize: 15, fontFamily: fonts.heading, color: colors.foreground },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.border, padding: 10, borderRadius: 0 },
  payActive: { borderColor: colors.foreground },
  payLabel: { flex: 1, fontSize: 14, fontFamily: fonts.body, color: colors.foreground },
  radio: { width: 16, height: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 0 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, marginTop: 2 },
  rowLabel: { fontSize: 13, color: colors.mutedForeground, fontFamily: fonts.body },
  rowValue: { fontSize: 13, color: colors.foreground, fontFamily: fonts.bodyBold },
  rowBold: { fontSize: 16, fontFamily: fonts.displayBold, color: colors.foreground },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 6 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card },
  footTotal: { fontSize: 18, fontFamily: fonts.displayBold, color: colors.foreground },
  footSub: { fontSize: 11, color: colors.mutedForeground, fontFamily: fonts.body },
  placeBtn: { flex: 1, marginLeft: 12 },
});
