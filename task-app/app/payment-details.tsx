import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { Building2, Smartphone } from 'lucide-react-native';
import ScreenHeader from '@/components/ScreenHeader';
import BottomSheet from '@/components/BottomSheet';
import { colors } from '@/lib/theme';

export default function PaymentDetailsScreen() {
    const [tab, setTab] = useState<'upi' | 'bank'>('upi');
    const [upi, setUpi] = useState('rahul@upi');
    const [accName, setAccName] = useState('Rahul Kumar');
    const [accNo, setAccNo] = useState('1234567890');
    const [ifsc, setIfsc] = useState('HDFC0001234');
    const [loading, setLoading] = useState(false);
    const [sheet, setSheet] = useState(false);

    const onSave = () => {
        setLoading(true);
        setTimeout(() => { setLoading(false); setSheet(true); }, 800);
    };

    return (
        <View style={styles.container}>
            <ScreenHeader title="Payment Details" />
            <ScrollView contentContainerStyle={{ paddingHorizontal: 6, paddingBottom: 24 }}>
                <View style={styles.tabs}>
                    <Pressable style={[styles.tab, tab === 'upi' && styles.tabActive]} onPress={() => setTab('upi')}>
                        <Smartphone size={14} color={tab === 'upi' ? '#FFFFFF' : colors.foreground} />
                        <Text style={[styles.tabText, tab === 'upi' && styles.tabTextActive]}>UPI</Text>
                    </Pressable>
                    <Pressable style={[styles.tab, tab === 'bank' && styles.tabActive]} onPress={() => setTab('bank')}>
                        <Building2 size={14} color={tab === 'bank' ? '#FFFFFF' : colors.foreground} />
                        <Text style={[styles.tabText, tab === 'bank' && styles.tabTextActive]}>Bank</Text>
                    </Pressable>
                </View>

                {tab === 'upi' ? (
                    <>
                        <Text style={styles.label}>UPI ID</Text>
                        <View style={styles.inputWrap}>
                            <TextInput value={upi} onChangeText={setUpi} style={styles.input}
                                placeholder="example@upi" placeholderTextColor={colors.mutedForeground} />
                        </View>
                    </>
                ) : (
                    <>
                        <Text style={styles.label}>Account Holder Name</Text>
                        <View style={styles.inputWrap}>
                            <TextInput value={accName} onChangeText={setAccName} style={styles.input}
                                placeholderTextColor={colors.mutedForeground} />
                        </View>
                        <Text style={styles.label}>Account Number</Text>
                        <View style={styles.inputWrap}>
                            <TextInput value={accNo} onChangeText={setAccNo} style={styles.input} keyboardType="number-pad"
                                placeholderTextColor={colors.mutedForeground} />
                        </View>
                        <Text style={styles.label}>IFSC Code</Text>
                        <View style={styles.inputWrap}>
                            <TextInput value={ifsc} onChangeText={setIfsc} style={styles.input} autoCapitalize="characters"
                                placeholderTextColor={colors.mutedForeground} />
                        </View>
                    </>
                )}

                <Pressable style={styles.saveBtn} onPress={onSave} disabled={loading}>
                    {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveText}>Save Details</Text>}
                </Pressable>
            </ScrollView>

            <BottomSheet
                visible={sheet} variant="success"
                title="Payment Details Saved"
                message="Your payment details have been updated."
                confirmText="Done"
                onClose={() => setSheet(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    tabs: { flexDirection: 'row', gap: 4, marginTop: 6 },
    tab: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        paddingVertical: 9, borderRadius: 6, backgroundColor: colors.card,
        borderWidth: 1, borderColor: colors.border,
    },
    tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    tabText: { color: colors.foreground, fontSize: 13, fontWeight: '600' },
    tabTextActive: { color: '#FFFFFF' },
    label: { color: colors.foreground, fontSize: 12, fontWeight: '600', marginTop: 8, marginBottom: 4 },
    inputWrap: {
        backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.inputBorder,
        borderRadius: 6, paddingHorizontal: 10,
    },
    input: { color: colors.foreground, fontSize: 13, paddingVertical: 8 },
    saveBtn: {
        backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 6,
        alignItems: 'center', justifyContent: 'center', marginTop: 12,
    },
    saveText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
