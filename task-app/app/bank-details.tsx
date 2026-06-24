import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import ScreenHeader from '@/components/ScreenHeader';
import BottomSheet from '@/components/BottomSheet';
import { colors } from '@/lib/theme';
import { Building2 } from 'lucide-react-native';
import { router } from 'expo-router';

export default function BankDetailsScreen() {
  const [holder, setHolder] = useState('Rahul Sharma');
  const [account, setAccount] = useState('1234567890');
  const [confirmAcc, setConfirmAcc] = useState('1234567890');
  const [ifsc, setIfsc] = useState('HDFC0001234');
  const [bank, setBank] = useState('HDFC Bank');
  const [branch, setBranch] = useState('Mumbai Main Branch');
  const [loading, setLoading] = useState(false);
  const [sheet, setSheet] = useState(false);

  const onSave = () => {
    if (!holder || !account || account !== confirmAcc || !ifsc) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); setSheet(true); }, 900);
  };

  const Field = ({ label, value, onChange, placeholder, keyboard }: any) => (
    <View style={{ marginTop: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value} onChangeText={onChange} placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground} keyboardType={keyboard}
        style={styles.input}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="Bank Details" />
      <ScrollView contentContainerStyle={{ padding: 6, paddingBottom: 24 }}>
        <View style={styles.headCard}>
          <View style={styles.iconWrap}><Building2 size={22} color="#FFFFFF" /></View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.headTitle}>Bank Account</Text>
            <Text style={styles.headSub}>Add your bank for fast withdrawals</Text>
          </View>
        </View>

        <View style={styles.formCard}>
          <Field label="Account Holder Name" value={holder} onChange={setHolder} placeholder="Full name" />
          <Field label="Account Number" value={account} onChange={setAccount} placeholder="Account number" keyboard="numeric" />
          <Field label="Confirm Account Number" value={confirmAcc} onChange={setConfirmAcc} placeholder="Re-enter account number" keyboard="numeric" />
          <Field label="IFSC Code" value={ifsc} onChange={setIfsc} placeholder="IFSC code" />
          <Field label="Bank Name" value={bank} onChange={setBank} placeholder="Bank name" />
          <Field label="Branch" value={branch} onChange={setBranch} placeholder="Branch" />
        </View>

        <Pressable style={styles.cta} onPress={onSave} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.ctaText}>Save Details</Text>}
        </Pressable>
      </ScrollView>

      <BottomSheet
        visible={sheet} variant="success"
        title="Bank Details Saved" message="Your bank account is ready for withdrawals."
        confirmText="Done"
        onConfirm={() => { setSheet(false); router.back(); }}
        onClose={() => setSheet(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary,
    borderRadius: 6, padding: 12, marginTop: 4,
  },
  iconWrap: {
    width: 44, height: 44, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  headTitle: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  headSub: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 1 },
  formCard: {
    backgroundColor: colors.card, borderRadius: 6, borderWidth: 1, borderColor: colors.border,
    padding: 10, marginTop: 6,
  },
  label: { color: colors.foreground, fontSize: 12, fontWeight: '600', marginBottom: 4 },
  input: {
    backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.inputBorder,
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8, color: colors.foreground, fontSize: 13,
  },
  cta: { marginTop: 10, backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
