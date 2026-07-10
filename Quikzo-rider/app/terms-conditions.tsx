import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, fonts } from '@/lib/theme';
import ScreenHeader from '@/components/ScreenHeader';

export default function TermsConditions() {
  return (
    <View style={styles.container}>
      <ScreenHeader title="Terms & conditions" />
      <ScrollView contentContainerStyle={{ padding: 6, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.p}>Last updated: June 2026</Text>
        <Text style={styles.h}>Use of the app</Text>
        <Text style={styles.p}>By using Qikzo you agree to place genuine orders and provide accurate delivery details.</Text>
        <Text style={styles.h}>Pricing & availability</Text>
        <Text style={styles.p}>Prices and product availability may change without notice. Final price is shown at checkout.</Text>
        <Text style={styles.h}>Orders & cancellation</Text>
        <Text style={styles.p}>Orders may be cancelled before packing. Refunds for prepaid orders are processed to the original payment method.</Text>
        <Text style={styles.h}>Liability</Text>
        <Text style={styles.p}>Qikzo is not liable for delays caused by circumstances beyond our control such as weather or traffic.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  p: { fontSize: 13, color: colors.mutedForeground, fontFamily: fonts.body, lineHeight: 21, marginTop: 6 },
  h: { fontSize: 16, fontFamily: fonts.displayBold, color: colors.foreground, marginTop: 16 },
});
