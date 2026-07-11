import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Image, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ShieldCheck } from 'lucide-react-native';
import { colors, fonts, radius } from '@/lib/theme';
import ScreenHeader from '@/components/ScreenHeader';
import Button from '@/components/Button';
import BottomSheet from '@/components/BottomSheet';
import { useSheet } from '@/lib/useSheet';
import { useAuth } from '@/lib/authStore';
import { authApi } from '@/lib/api/endpoints/auth';
import { ridersApi } from '@/lib/api/endpoints/riders';
import { ApiError } from '@/lib/api/errors';

const HERO = require('../assets/images/otp-hero.png');
const LEN = 6;

export default function OtpScreen() {
  const insets = useSafeAreaInsets();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  // OTP is never prefilled — the rider must enter the code manually.
  const [digits, setDigits] = useState<string[]>(Array(LEN).fill(''));
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(30);
  const inputs = useRef<(TextInput | null)[]>([]);
  const sheet = useSheet();
  const setPhone = useAuth((s) => s.setPhone);
  const setVehicleProfile = useAuth((s) => s.setVehicleProfile);
  const profileComplete = useAuth((s) => s.profileComplete);

  useEffect(() => {
    if (timer <= 0) return;
    const t = setTimeout(() => setTimer((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [timer]);

  const onChange = (val: string, i: number) => {
    const v = val.replace(/[^0-9]/g, '');
    const next = [...digits];
    next[i] = v.slice(-1);
    setDigits(next);
    if (v && i < LEN - 1) inputs.current[i + 1]?.focus();
  };

  const onKey = (e: any, i: number) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const onVerify = async () => {
    const code = digits.join('');
    if (code.length < LEN) {
      sheet.show({ variant: 'error', title: 'Incomplete OTP', message: `Enter the ${LEN}-digit code sent to your number.` });
      return;
    }
    setLoading(true);
    try {
      await authApi.verifyOtp(String(phone), code);
      setPhone(`+91 ${phone}`);
      try { (await import('@/lib/socket')).connectSocket(); } catch {}
      import('@/lib/push').then((m) => m.registerForPushAsync('rider').catch(() => {}));

      // Check server profile: existing rider (with a real vehicleNo) skips vehicle-setup.
      let hasProfile = profileComplete;
      try {
        const me = await ridersApi.me();
        const vNo = (me?.vehicleNo || '').trim().toUpperCase();
        if (vNo && vNo !== 'PENDING') {
          const t = /auto/i.test(me.vehicle) ? 'auto' : /sedan|car/i.test(me.vehicle) ? 'sedan' : 'bike';
          setVehicleProfile(t as any, vNo);
          hasProfile = true;
        }
      } catch {}
      router.replace(hasProfile ? '/(tabs)' : '/vehicle-setup');
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Verification failed. Please try again.';
      sheet.show({ variant: 'error', title: 'Verification failed', message: msg });
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    try {
      await authApi.requestOtp(String(phone));
      setTimer(30);
      sheet.show({ variant: 'success', title: 'OTP sent', message: 'A new code has been sent to your number.' });
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Could not resend OTP.';
      sheet.show({ variant: 'error', title: 'Resend failed', message: msg });
    }
  };


  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
      <ScreenHeader title="Verify OTP" />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Illustrated hero */}
        <View style={styles.heroStage}>
          <View style={styles.blob} />
          <Image source={HERO} resizeMode="contain" style={styles.heroImg} />
        </View>

        <Text style={styles.headline}>Enter the 6-digit code</Text>
        <Text style={styles.sub}>Sent to +91 {phone}</Text>

        <View style={styles.otpRow}>
          {digits.map((d, i) => (
            <TextInput
              key={i}
              ref={(r) => { inputs.current[i] = r; }}
              autoFocus={i === 0}
              style={[styles.otpBox, d ? styles.otpBoxFilled : null]}
              keyboardType="number-pad"
              maxLength={1}
              value={d}
              onChangeText={(v) => onChange(v, i)}
              onKeyPress={(e) => onKey(e, i)}
            />
          ))}
        </View>

        <Button label="Verify & Continue" loading={loading} onPress={onVerify} style={styles.btn} />

        <View style={styles.trust}>
          <ShieldCheck size={14} color={colors.success} strokeWidth={2.2} />
          <Text style={styles.trustText}>End-to-end secured verification</Text>
        </View>

        <View style={styles.resendRow}>
          {timer > 0 ? (
            <Text style={styles.resendMuted}>Resend code in 0:{timer.toString().padStart(2, '0')}</Text>
          ) : (
            <Pressable onPress={onResend}>
              <Text style={styles.resend}>Resend OTP</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      <BottomSheet visible={sheet.visible} {...sheet.config} onClose={sheet.hide} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  body: { paddingHorizontal: 6, paddingTop: 8, paddingBottom: 24 },
  heroStage: { width: '100%', height: 200, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  blob: { position: 'absolute', width: 200, height: 200, borderRadius: radius.pill, backgroundColor: colors.accent, opacity: 0.18 },
  heroImg: { width: '80%', height: '100%' },
  headline: { fontSize: 22, fontFamily: fonts.displayBold, color: colors.foreground },
  sub: { fontSize: 13, color: colors.mutedForeground, fontFamily: fonts.body, marginTop: 6 },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, gap: 6 },
  otpBox: {
    flex: 1, height: 52, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: radius.md,
    textAlign: 'center', fontSize: 20, fontFamily: fonts.displayBold, color: colors.foreground,
    backgroundColor: colors.inputBg,
  },
  otpBoxFilled: { borderColor: colors.foreground },
  btn: { marginTop: 20, borderRadius: radius.sm },
  trust: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: 10 },
  trustText: { fontSize: 11, fontFamily: fonts.bodyBold, color: colors.mutedForeground },
  resendRow: { alignItems: 'center', marginTop: 14 },
  resendMuted: { fontSize: 13, color: colors.mutedForeground, fontFamily: fonts.body },
  resend: { fontSize: 13, color: colors.foreground, fontFamily: fonts.bodyBold, textDecorationLine: 'underline' },
});
