import React, { useState } from 'react';
import { View, Image, StyleSheet, ScrollView, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, fonts, radius } from '@/lib/theme';
import Brand from '@/components/Brand';
import Input from '@/components/Input';
import Button from '@/components/Button';
import BottomSheet from '@/components/BottomSheet';
import { useSheet } from '@/lib/useSheet';
import { authApi } from '@/lib/api/endpoints/auth';
import { ApiError } from '@/lib/api/errors';

// Illustrations replace the marketing copy on the login screen.
const HERO = require('../assets/images/login-hero.png');
const SECURE = require('../assets/images/login-secure.png');

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
      const res = await authApi.requestOtp(phone);
      // Server returns { devCode } only when OTP_DEV_MODE=true — surface it in dev
      // so testers don't need an SMS gateway to log in.
      const devCode = (res as any)?.devCode as string | undefined;
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
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandRow}>
          <Brand size={30} />
        </View>

        {/* Top illustration */}
        <View style={styles.heroWrap}>
          <Image source={HERO} resizeMode="contain" style={styles.heroImg} />
        </View>

        {/* Input form */}
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
          <Button label="Continue" loading={loading} onPress={onContinue} style={styles.btn} />
        </View>


      </ScrollView>

      <Text style={styles.terms}>By continuing you agree to our Terms & Privacy Policy.</Text>

      <BottomSheet visible={sheet.visible} {...sheet.config} onClose={sheet.hide} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 6, backgroundColor: colors.background },
  scroll: { flexGrow: 1, justifyContent: 'flex-start' },
  brandRow: { paddingTop: 6 },
  heroWrap: {
    width: '100%', alignItems: 'center', justifyContent: 'center',
    marginTop: 6,
  },
  heroImg: { width: '100%', height: 220 },
  form: { marginTop: 6, gap: 6 },
  btn: { marginTop: 6, borderRadius: radius.sm },
  secureWrap: { width: '100%', alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  secureImg: { width: '100%', height: 140 },
  terms: { fontSize: 11, color: colors.mutedForeground, fontFamily: fonts.body, textAlign: 'center', marginTop: 6 },
  // exported but unused style — kept to satisfy radius token contract
  _radius: { borderRadius: radius.sm },
});
