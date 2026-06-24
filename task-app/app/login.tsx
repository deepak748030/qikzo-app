import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, fonts } from '@/lib/theme';
import Brand from '@/components/Brand';
import Input from '@/components/Input';
import Button from '@/components/Button';
import BottomSheet from '@/components/BottomSheet';
import { useSheet } from '@/lib/useSheet';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const sheet = useSheet();

  const onContinue = () => {
    if (!/^[6-9]\d{9}$/.test(phone)) {
      sheet.show({ variant: 'error', title: 'Invalid number', message: 'Enter a valid 10-digit Indian mobile number.' });
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.push({ pathname: '/otp', params: { phone } });
    }, 700);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 }]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Brand size={38} />
        <Text style={styles.headline}>Fresh groceries,{'\n'}delivered fast.</Text>
        <Text style={styles.sub}>Login or sign up with your mobile number to start ordering.</Text>

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

      <Text style={styles.terms}>
        By continuing you agree to our Terms & Privacy Policy.
      </Text>

      <BottomSheet visible={sheet.visible} {...sheet.config} onClose={sheet.hide} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 6, backgroundColor: colors.background },
  scroll: { flexGrow: 1, justifyContent: 'center' },
  headline: { fontSize: 30, fontFamily: fonts.displayBold, color: colors.foreground, marginTop: 28, letterSpacing: -0.5 },
  sub: { fontSize: 14, color: colors.mutedForeground, fontFamily: fonts.body, marginTop: 8, lineHeight: 20 },
  form: { marginTop: 28, gap: 6 },
  btn: { marginTop: 6 },
  terms: { fontSize: 11, color: colors.mutedForeground, fontFamily: fonts.body, textAlign: 'center' },
});
