import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, fonts } from '@/lib/theme';
import ScreenHeader from '@/components/ScreenHeader';
import Brand from '@/components/Brand';

export default function AboutUs() {
  return (
    <View style={styles.container}>
      <ScreenHeader title="About us" />
      <ScrollView contentContainerStyle={{ padding: 6, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <View style={{ marginVertical: 10 }}><Brand size={34} /></View>
        <Text style={styles.p}>
          Qikzo is an on-demand point-to-point delivery app. Book a rider to pick up anything — groceries,
          food, medicines, parcels — from any address in your city and drop it wherever you want, with live tracking
          and transparent distance-based pricing.
        </Text>
        <Text style={styles.h}>Our mission</Text>
        <Text style={styles.p}>
          To make city logistics effortless for every Indian. Tap, set pickup & drop, and a captain on a bike does the rest.
        </Text>
        <Text style={styles.h}>Why Qikzo</Text>
        <Text style={styles.p}>
          • Anything, anywhere — pickup from any shop or address{'\n'}
          • Verified riders, live trip tracking{'\n'}
          • Honest distance-based fares with no surprises{'\n'}
          • Cash or UPI — pay your way
        </Text>
        <Text style={styles.muted}>Made with care in India 🇮🇳</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  p: { fontSize: 13, color: colors.mutedForeground, fontFamily: fonts.body, lineHeight: 21, marginTop: 6 },
  h: { fontSize: 16, fontFamily: fonts.displayBold, color: colors.foreground, marginTop: 16 },
  muted: { fontSize: 12, color: colors.mutedForeground, fontFamily: fonts.body, marginTop: 20, textAlign: 'center' },
});
