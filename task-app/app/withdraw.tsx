import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator } from 'react-native';
import ScreenHeader from '@/components/ScreenHeader';
import { colors } from '@/lib/theme';
import { user } from '@/lib/mockData';
import { Smartphone, Building2 } from 'lucide-react-native';

const QUICK = [100, 200, 500, 1000];
const METHODS = [
  { key: 'upi', label: 'UPI', sub: 'Instant Transfer', Icon: Smartphone },
  { key: 'bank', label: 'Bank Transfer', sub: '2-3 Working Days', Icon: Building2 },
];

export default function Withdraw() {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('upi');
  const [loading, setLoading] = useState(false);

  const onWithdraw = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1200);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Withdraw" />
      <ScrollView contentContainerStyle={{ padding: 6, paddingBottom: 24 }}>
        <View style={styles.balanceBox}>
          <Text style={styles.balanceLabel}>Your Balance</Text>
          <Text style={styles.balanceValue}>₹ {user.balance.toFixed(2)}</Text>
        </View>

        <Text style={styles.label}>Enter Amount</Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          placeholder="Enter amount"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="numeric"
          style={styles.input}
        />

        <View style={styles.quickRow}>
          {QUICK.map((q) => (
            <Pressable key={q} style={styles.quickBtn} onPress={() => setAmount(String(q))}>
              <Text style={styles.quickText}>₹{q}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Select Withdrawal Method</Text>
        {METHODS.map((m) => {
          const active = method === m.key;
          return (
            <Pressable key={m.key} style={[styles.methodRow, active && styles.methodActive]} onPress={() => setMethod(m.key)}>
              <View style={[styles.methodIcon, { backgroundColor: active ? colors.chipBg : '#F1F5F9' }]}>
                <m.Icon size={18} color={active ? colors.primary : colors.mutedForeground} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.methodLabel}>{m.label}</Text>
                <Text style={styles.methodSub}>{m.sub}</Text>
              </View>
              <View style={[styles.radioOuter, active && { borderColor: colors.primary }]}>
                {active && <View style={styles.radioInner} />}
              </View>
            </Pressable>
          );
        })}

        <Pressable style={styles.cta} onPress={onWithdraw} disabled={loading || !amount}>
          {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.ctaText}>Withdraw Now</Text>}
        </Pressable>

        <View style={styles.note}>
          <Text style={styles.noteText}>Note:</Text>
          <Text style={styles.noteText}>Minimum withdrawal amount is ₹100</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  balanceBox: {
    backgroundColor: colors.card, padding: 12, borderRadius: 6,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', marginTop: 4,
  },
  balanceLabel: { color: colors.mutedForeground, fontSize: 12 },
  balanceValue: { color: colors.foreground, fontWeight: '800', fontSize: 22, marginTop: 2 },
  label: { color: colors.foreground, fontWeight: '700', fontSize: 12, marginTop: 8, marginBottom: 4 },
  input: {
    backgroundColor: colors.inputBg, borderRadius: 6, borderWidth: 1, borderColor: colors.inputBorder,
    paddingHorizontal: 10, paddingVertical: 8, color: colors.foreground, fontSize: 14,
  },
  quickRow: { flexDirection: 'row', gap: 4, marginTop: 4 },
  quickBtn: {
    flex: 1, backgroundColor: colors.card, borderRadius: 6, paddingVertical: 8,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  quickText: { color: colors.primary, fontWeight: '700', fontSize: 12 },
  methodRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card,
    padding: 10, borderRadius: 6, borderWidth: 1, borderColor: colors.border, marginTop: 4,
  },
  methodActive: { borderColor: colors.primary },
  methodIcon: { width: 34, height: 34, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  methodLabel: { color: colors.foreground, fontWeight: '700', fontSize: 13 },
  methodSub: { color: colors.mutedForeground, fontSize: 11 },
  radioOuter: {
    width: 18, height: 18, borderRadius: 9, borderWidth: 2,
    borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  radioInner: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary },
  cta: {
    backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 6,
    alignItems: 'center', marginTop: 12,
  },
  ctaText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  note: {
    backgroundColor: colors.card, padding: 10, borderRadius: 6,
    borderWidth: 1, borderColor: colors.border, marginTop: 8,
  },
  noteText: { color: colors.mutedForeground, fontSize: 11 },
});
