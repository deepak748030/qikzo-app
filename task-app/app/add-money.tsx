import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import ScreenHeader from '@/components/ScreenHeader';
import BottomSheet from '@/components/BottomSheet';
import { colors } from '@/lib/theme';
import { Wallet, CreditCard, Smartphone, Building2 } from 'lucide-react-native';
import { router } from 'expo-router';

const PRESETS = [100, 500, 1000, 2000, 5000, 10000];

const METHODS = [
  { key: 'upi', label: 'UPI', Icon: Smartphone, color: colors.primary, bg: '#DBEAFE' },
  { key: 'card', label: 'Card', Icon: CreditCard, color: colors.success, bg: '#DCFCE7' },
  { key: 'bank', label: 'Net Banking', Icon: Building2, color: colors.warning, bg: '#FEF3C7' },
];

export default function AddMoneyScreen() {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<string>('upi');
  const [loading, setLoading] = useState(false);
  const [sheet, setSheet] = useState(false);

  const onAdd = () => {
    if (!amount || Number(amount) <= 0) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSheet(true);
    }, 900);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Add Money" />
      <ScrollView contentContainerStyle={{ padding: 6, paddingBottom: 24 }}>
        <View style={styles.amountCard}>
          <View style={styles.iconWrap}><Wallet size={22} color="#FFFFFF" /></View>
          <Text style={styles.label}>Enter Amount</Text>
          <View style={styles.inputRow}>
            <Text style={styles.currency}>₹</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="rgba(255,255,255,0.7)"
              style={styles.amountInput}
            />
          </View>
        </View>

        <Text style={styles.section}>Quick Add</Text>
        <View style={styles.presetGrid}>
          {PRESETS.map((p) => (
            <Pressable key={p} style={styles.preset} onPress={() => setAmount(String(p))}>
              <Text style={styles.presetText}>₹ {p}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.section}>Payment Method</Text>
        <View style={styles.methodCard}>
          {METHODS.map((m, i) => {
            const active = method === m.key;
            return (
              <React.Fragment key={m.key}>
                {i > 0 && <View style={styles.sep} />}
                <Pressable style={styles.methodRow} onPress={() => setMethod(m.key)}>
                  <View style={[styles.methodIcon, { backgroundColor: m.bg }]}>
                    <m.Icon size={16} color={m.color} />
                  </View>
                  <Text style={styles.methodLabel}>{m.label}</Text>
                  <View style={[styles.radio, active && styles.radioActive]}>
                    {active && <View style={styles.radioDot} />}
                  </View>
                </Pressable>
              </React.Fragment>
            );
          })}
        </View>

        <Pressable style={styles.cta} onPress={onAdd} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.ctaText}>Add Money</Text>}
        </Pressable>
      </ScrollView>

      <BottomSheet
        visible={sheet}
        variant="success"
        title="Money Added"
        message={`₹ ${amount} has been added to your wallet.`}
        confirmText="Done"
        onConfirm={() => { setSheet(false); router.back(); }}
        onClose={() => setSheet(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  amountCard: {
    backgroundColor: colors.primary, borderRadius: 6, padding: 14, alignItems: 'center', marginTop: 4,
  },
  iconWrap: {
    width: 44, height: 44, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  label: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  currency: { color: '#FFFFFF', fontSize: 26, fontWeight: '800', marginRight: 4 },
  amountInput: { color: '#FFFFFF', fontSize: 32, fontWeight: '800', minWidth: 120, textAlign: 'center', padding: 0 },
  section: { color: colors.foreground, fontWeight: '700', fontSize: 13, marginTop: 10, marginBottom: 4 },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  preset: {
    width: '32.5%', backgroundColor: colors.card, paddingVertical: 10, alignItems: 'center',
    borderRadius: 6, borderWidth: 1, borderColor: colors.border,
  },
  presetText: { color: colors.foreground, fontWeight: '700', fontSize: 13 },
  methodCard: { backgroundColor: colors.card, borderRadius: 6, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  methodRow: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 10 },
  methodIcon: { width: 30, height: 30, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  methodLabel: { flex: 1, color: colors.foreground, fontWeight: '600', fontSize: 13 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: colors.primary },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  sep: { height: 1, backgroundColor: colors.border },
  cta: { marginTop: 10, backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
