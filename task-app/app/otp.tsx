import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, fonts, radius } from '@/lib/theme';
import ScreenHeader from '@/components/ScreenHeader';
import Button from '@/components/Button';
import BottomSheet from '@/components/BottomSheet';
import { useSheet } from '@/lib/useSheet';
import { useAuth } from '@/lib/authStore';

const LEN = 6;

export default function OtpScreen() {
  const insets = useSafeAreaInsets();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [digits, setDigits] = useState<string[]>(Array(LEN).fill(''));
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(30);
  const inputs = useRef<(TextInput | null)[]>([]);
  const sheet = useSheet();
  const setPhone = useAuth((s) => s.setPhone);

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

  const onVerify = () => {
    const code = digits.join('');
    if (code.length < LEN) {
      sheet.show({ variant: 'error', title: 'Incomplete OTP', message: `Enter the ${LEN}-digit code sent to your number.` });
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setPhone(`+91 ${phone}`);
      router.replace('/(tabs)');
    }, 800);
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
      <ScreenHeader title="Verify OTP" />
      <View style={styles.body}>
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

        <View style={styles.resendRow}>
          {timer > 0 ? (
            <Text style={styles.resendMuted}>Resend code in 0:{timer.toString().padStart(2, '0')}</Text>
          ) : (
            <Pressable onPress={() => { setTimer(30); sheet.show({ variant: 'success', title: 'OTP sent', message: 'A new code has been sent to your number.' }); }}>
              <Text style={styles.resend}>Resend OTP</Text>
            </Pressable>
          )}
        </View>
      </View>

      <BottomSheet visible={sheet.visible} {...sheet.config} onClose={sheet.hide} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  body: { paddingHorizontal: 6, paddingTop: 24 },
  headline: { fontSize: 22, fontFamily: fonts.displayBold, color: colors.foreground },
  sub: { fontSize: 13, color: colors.mutedForeground, fontFamily: fonts.body, marginTop: 6 },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24, gap: 6, },
  otpBox: {
    flex: 1, height: 52, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: radius.md,
    textAlign: 'center', fontSize: 20, fontFamily: fonts.displayBold, color: colors.foreground,
    backgroundColor: colors.inputBg,
  },
  otpBoxFilled: { borderColor: colors.foreground },
  btn: { marginTop: 24, borderRadius: radius.sm },
  resendRow: { alignItems: 'center', marginTop: 18 },
  resendMuted: { fontSize: 13, color: colors.mutedForeground, fontFamily: fonts.body },
  resend: { fontSize: 13, color: colors.foreground, fontFamily: fonts.bodyBold, textDecorationLine: 'underline' },
});
