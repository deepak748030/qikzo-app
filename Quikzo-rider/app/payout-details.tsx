import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShieldCheck, Landmark } from 'lucide-react-native';
import { colors, fonts, radius } from '@/lib/theme';
import ScreenHeader from '@/components/ScreenHeader';
import Input from '@/components/Input';
import Button from '@/components/Button';
import BottomSheet from '@/components/BottomSheet';
import { useSheet } from '@/lib/useSheet';
import { useAuth } from '@/lib/authStore';

const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

// Payout details — riders add the bank account earnings are deposited into.
// Reached from Earnings tab payout card and Profile → Payout details.
export default function PayoutDetailsScreen() {
    const insets = useSafeAreaInsets();
    const sheet = useSheet();
    const payout = useAuth((s) => s.payout);
    const setPayout = useAuth((s) => s.setPayout);
    const riderName = useAuth((s) => s.name);

    const [holder, setHolder] = useState(payout?.accountHolder ?? riderName);
    const [acct, setAcct] = useState(payout?.accountNumber ?? '');
    const [confirmAcct, setConfirmAcct] = useState(payout?.accountNumber ?? '');
    const [ifsc, setIfsc] = useState(payout?.ifsc ?? '');
    const [bank, setBank] = useState(payout?.bankName ?? '');
    const [upi, setUpi] = useState(payout?.upiId ?? '');
    const [loading, setLoading] = useState(false);

    const save = () => {
        if (holder.trim().length < 2) return sheet.show({ variant: 'error', title: 'Name required', message: 'Enter the account holder name as on the bank passbook.' });
        const clean = acct.replace(/\s+/g, '');
        if (!/^\d{9,18}$/.test(clean)) return sheet.show({ variant: 'error', title: 'Invalid account number', message: 'Account number must be 9–18 digits.' });
        if (clean !== confirmAcct.replace(/\s+/g, '')) return sheet.show({ variant: 'error', title: 'Numbers don’t match', message: 'Re-enter the account number to confirm.' });
        if (!IFSC_RE.test(ifsc.toUpperCase().trim())) return sheet.show({ variant: 'error', title: 'Invalid IFSC', message: 'IFSC should look like HDFC0001234.' });
        if (bank.trim().length < 2) return sheet.show({ variant: 'error', title: 'Bank name required', message: 'Enter the bank name (e.g. HDFC Bank).' });

        setLoading(true);
        setTimeout(() => {
            setPayout({ accountHolder: holder, accountNumber: clean, ifsc, bankName: bank, upiId: upi });
            setLoading(false);
            sheet.show({
                variant: 'success',
                title: 'Bank account saved',
                message: 'Daily payouts will be deposited to this account.',
                confirmText: 'Done',
                onConfirm: () => router.back(),
            });
        }, 700);
    };

    return (
        <View style={styles.container}>
            <ScreenHeader title="Payout details" />
            <ScrollView contentContainerStyle={{ padding: 6, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
                <View style={styles.hero}>
                    <View style={styles.heroIcon}><Landmark size={18} color={colors.primaryForeground} /></View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.heroTitle}>{payout ? 'Update your bank account' : 'Add your bank account'}</Text>
                        <Text style={styles.heroSub}>Earnings and tips are settled to this account every morning.</Text>
                    </View>
                </View>

                <View style={{ gap: 6, marginTop: 10 }}>
                    <Input label="Account holder name" placeholder="As per bank records" value={holder} onChangeText={setHolder} />
                    <Input label="Account number" placeholder="9–18 digits" keyboardType="number-pad" value={acct} onChangeText={setAcct} secureTextEntry />
                    <Input label="Confirm account number" placeholder="Re-enter" keyboardType="number-pad" value={confirmAcct} onChangeText={setConfirmAcct} />
                    <Input label="IFSC code" placeholder="e.g. HDFC0001234" autoCapitalize="characters" value={ifsc} onChangeText={setIfsc} maxLength={11} />
                    <Input label="Bank name" placeholder="e.g. HDFC Bank" value={bank} onChangeText={setBank} />
                    <Input label="UPI ID (optional)" placeholder="name@bank" autoCapitalize="none" value={upi} onChangeText={setUpi} />
                </View>

                <View style={styles.trust}>
                    <ShieldCheck size={14} color={colors.success} />
                    <Text style={styles.trustText}>Your details are encrypted and used only for payouts.</Text>
                </View>

                <Button label={payout ? 'Update account' : 'Save bank account'} loading={loading} onPress={save} style={{ marginTop: 14 }} />
            </ScrollView>
            <BottomSheet visible={sheet.visible} {...sheet.config} onClose={sheet.hide} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    hero: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12 },
    heroIcon: { width: 36, height: 36, borderRadius: radius.pill, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    heroTitle: { fontSize: 14, fontFamily: fonts.displayBold, color: colors.foreground },
    heroSub: { fontSize: 12, fontFamily: fonts.body, color: colors.mutedForeground, marginTop: 2 },
    trust: { flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 12, paddingHorizontal: 6 },
    trustText: { fontSize: 11, fontFamily: fonts.body, color: colors.mutedForeground, flex: 1 },
});
