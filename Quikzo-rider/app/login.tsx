import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Text, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ShieldCheck } from 'lucide-react-native';
import { colors, fonts, radius } from '@/lib/theme';
import Input from '@/components/Input';
import Button from '@/components/Button';
import BottomSheet from '@/components/BottomSheet';
import { useSheet } from '@/lib/useSheet';
import { authApi } from '@/lib/api/endpoints/auth';
import { ApiError } from '@/lib/api/errors';

const HERO = require('../assets/images/login-hero.png');

// Rider login: illustrated hero + phone/OTP flow.
export default function LoginScreen() {
    const insets = useSafeAreaInsets();
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const sheet = useSheet();

    const onContinue = async () => {
        if (!/^[6-9]\d{9}$/.test(phone)) {
            sheet.show({ variant: 'error', title: 'Invalid number', message: 'Enter a valid 10-digit Indian mobile number.' });
            return;
        }
        setLoading(true);
        try {
            const res: any = await authApi.requestOtp(phone);
            const devCode = res?.devCode as string | undefined;
            router.push({ pathname: '/otp', params: { phone, devCode: devCode ?? '' } });
        } catch (e) {
            const msg = e instanceof ApiError ? e.message : 'Could not send OTP. Please try again.';
            sheet.show({ variant: 'error', title: 'Unable to send OTP', message: msg });
        } finally {
            setLoading(false);
        }
    };


    return (
        <View style={[styles.container, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 10 }]}>
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {/* Brand pill */}
                <View style={styles.brandPill}>
                    <View style={styles.brandDot} />
                    <Text style={styles.brandName}>QIKZO PARTNER</Text>
                </View>

                {/* Illustrated hero */}
                <View style={styles.heroWrap}>
                    <View style={styles.heroStage}>
                        <View style={styles.blob} />
                        <Image source={HERO} resizeMode="contain" style={styles.heroImg} />
                    </View>
                </View>

                {/* Headline */}
                <View style={styles.copy}>
                    <Text style={styles.headline}>Drive. Deliver. Earn.</Text>
                    <Text style={styles.helper}>Sign in with your registered mobile number to start your next trip.</Text>
                </View>

                {/* Form */}
                <View style={styles.form}>
                    <Input
                        label="Mobile number"
                        prefix="+91"
                        placeholder="98765 43210"
                        keyboardType="number-pad"
                        maxLength={10}
                        value={phone}
                        onChangeText={(t) => setPhone(t.replace(/[^0-9]/g, ''))}
                    />
                    <Button label="Send OTP" loading={loading} onPress={onContinue} style={styles.btn} />

                    <View style={styles.trust}>
                        <ShieldCheck size={14} color={colors.success} strokeWidth={2.2} />
                        <Text style={styles.trustText}>Secured with 6-digit OTP verification</Text>
                    </View>
                </View>
            </ScrollView>

            <Text style={styles.terms}>By continuing you agree to our Terms & Privacy Policy.</Text>
            <BottomSheet visible={sheet.visible} {...sheet.config} onClose={sheet.hide} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 6, backgroundColor: colors.background },
    scroll: { flexGrow: 1 },
    brandPill: {
        alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill,
        backgroundColor: colors.chipBg, borderWidth: 1, borderColor: colors.border, marginLeft: 6,
    },
    brandDot: { width: 8, height: 8, borderRadius: radius.pill, backgroundColor: colors.accent },
    brandName: { fontSize: 11, fontFamily: fonts.bodyBold, color: colors.foreground, letterSpacing: 1.2 },

    heroWrap: { width: '100%', alignItems: 'center', marginTop: 10 },
    heroStage: { width: '100%', height: 260, alignItems: 'center', justifyContent: 'center' },
    blob: {
        position: 'absolute', width: 240, height: 240, borderRadius: radius.pill,
        backgroundColor: colors.accent, opacity: 0.18, top: 20,
    },
    heroImg: { width: '95%', height: '100%' },

    copy: { paddingHorizontal: 6, marginTop: 4 },
    headline: { fontSize: 26, fontFamily: fonts.displayBold, color: colors.foreground, letterSpacing: -0.6 },
    helper: { fontSize: 13, fontFamily: fonts.body, color: colors.mutedForeground, marginTop: 6, lineHeight: 19 },

    form: { marginTop: 18, gap: 10, paddingHorizontal: 6 },
    btn: { marginTop: 4, borderRadius: radius.sm },
    trust: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: 4 },
    trustText: { fontSize: 11, fontFamily: fonts.bodyBold, color: colors.mutedForeground },

    terms: { fontSize: 11, color: colors.mutedForeground, fontFamily: fonts.body, textAlign: 'center', marginTop: 6 },
});
