import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, fonts } from '@/lib/theme';
import ScreenHeader from '@/components/ScreenHeader';
import Skeleton from '@/components/Skeleton';
import { useInitialLoad } from '@/lib/useInitialLoad';

export default function PrivacyPolicy() {
  const loading = useInitialLoad();
  return (
    <View style={styles.container}>
      <ScreenHeader title="Privacy policy" />
      {loading ? (
        <View style={{ padding: 6, gap: 8 }}>
          <Skeleton width={140} height={12} />
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{ gap: 6, marginTop: 8 }}>
              <Skeleton width={160} height={16} />
              <Skeleton width="100%" height={12} />
              <Skeleton width="90%" height={12} />
            </View>
          ))}
        </View>
      ) : (
      <ScrollView contentContainerStyle={{ padding: 6, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.p}>Last updated: June 2026</Text>
        <Text style={styles.h}>Information we collect</Text>
        <Text style={styles.p}>We collect your mobile number, delivery address and order details to fulfil your grocery orders.</Text>
        <Text style={styles.h}>How we use it</Text>
        <Text style={styles.p}>Your data is used to process orders, arrange delivery, provide support and improve the Qikzo experience. We never sell your personal data.</Text>
        <Text style={styles.h}>Security</Text>
        <Text style={styles.p}>We use industry-standard measures to protect your information. OTP verification keeps your account secure.</Text>
        <Text style={styles.h}>Contact</Text>
        <Text style={styles.p}>For privacy questions, email privacy@qikzo.in.</Text>
      </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  p: { fontSize: 13, color: colors.mutedForeground, fontFamily: fonts.body, lineHeight: 21, marginTop: 6 },
  h: { fontSize: 16, fontFamily: fonts.displayBold, color: colors.foreground, marginTop: 16 },
});
