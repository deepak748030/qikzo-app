import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { ShieldCheck, IdCard, Camera } from 'lucide-react-native';
import ScreenHeader from '@/components/ScreenHeader';
import BottomSheet from '@/components/BottomSheet';
import { colors } from '@/lib/theme';
import { user } from '@/lib/mockData';

export default function KycVerificationScreen() {
    const [pan, setPan] = useState('ABCDE1234F');
    const [aadhaar, setAadhaar] = useState('1234 5678 9012');
    const [loading, setLoading] = useState(false);
    const [sheet, setSheet] = useState(false);

    const onSubmit = () => {
        setLoading(true);
        setTimeout(() => { setLoading(false); setSheet(true); }, 900);
    };

    return (
        <View style={styles.container}>
            <ScreenHeader title="KYC Verification" />
            <ScrollView contentContainerStyle={{ paddingHorizontal: 6, paddingBottom: 24 }}>
                <View style={styles.statusCard}>
                    <View style={styles.statusIcon}><ShieldCheck size={22} color={colors.success} /></View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.statusTitle}>KYC {user.kycVerified ? 'Verified' : 'Pending'}</Text>
                        <Text style={styles.statusSub}>
                            {user.kycVerified ? 'Your account is fully verified.' : 'Submit your details to verify.'}
                        </Text>
                    </View>
                </View>

                <Text style={styles.label}>PAN Number</Text>
                <View style={styles.inputWrap}>
                    <IdCard size={16} color={colors.mutedForeground} />
                    <TextInput
                        value={pan} onChangeText={setPan} style={styles.input}
                        placeholder="Enter PAN" placeholderTextColor={colors.mutedForeground} autoCapitalize="characters"
                    />
                </View>

                <Text style={styles.label}>Aadhaar Number</Text>
                <View style={styles.inputWrap}>
                    <IdCard size={16} color={colors.mutedForeground} />
                    <TextInput
                        value={aadhaar} onChangeText={setAadhaar} style={styles.input}
                        placeholder="Enter Aadhaar" placeholderTextColor={colors.mutedForeground} keyboardType="number-pad"
                    />
                </View>

                <Pressable style={styles.uploadBox}>
                    <Camera size={20} color={colors.primary} />
                    <Text style={styles.uploadText}>Upload Selfie with ID</Text>
                </Pressable>

                <Pressable style={styles.submitBtn} onPress={onSubmit} disabled={loading}>
                    {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>Submit for Verification</Text>}
                </Pressable>
            </ScrollView>

            <BottomSheet
                visible={sheet}
                variant="success"
                title="KYC Submitted"
                message="Your KYC details have been submitted successfully."
                confirmText="Done"
                onClose={() => setSheet(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    statusCard: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card,
        padding: 10, borderRadius: 6, borderWidth: 1, borderColor: colors.border, marginTop: 6,
    },
    statusIcon: { width: 36, height: 36, borderRadius: 6, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' },
    statusTitle: { color: colors.foreground, fontWeight: '700', fontSize: 13 },
    statusSub: { color: colors.mutedForeground, fontSize: 11, marginTop: 1 },
    label: { color: colors.foreground, fontSize: 12, fontWeight: '600', marginTop: 8, marginBottom: 4 },
    inputWrap: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inputBg,
        borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 6, paddingHorizontal: 10, gap: 6,
    },
    input: { flex: 1, color: colors.foreground, fontSize: 13, paddingVertical: 8 },
    uploadBox: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: colors.card, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary,
        borderRadius: 6, paddingVertical: 18, marginTop: 8,
    },
    uploadText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
    submitBtn: {
        backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 6,
        alignItems: 'center', justifyContent: 'center', marginTop: 12,
    },
    submitText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
