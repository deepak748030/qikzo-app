import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, fonts } from '@/lib/theme';
import ScreenHeader from '@/components/ScreenHeader';

const FAQS = [
  { q: 'How fast is delivery?', a: 'Most orders are delivered within 30 minutes depending on your location.' },
  { q: 'What are the delivery charges?', a: 'Delivery is free on orders above ₹199. Below that a flat ₹25 fee applies.' },
  { q: 'How do I track my order?', a: 'Open the Orders tab to see live status of every order you place.' },
  { q: 'What payment methods are accepted?', a: 'Cash on delivery, UPI, and credit/debit cards are supported.' },
  { q: 'Can I cancel an order?', a: 'Orders can be cancelled before they are packed from the Orders tab.' },
];

export default function HelpSupport() {
  return (
    <View style={styles.container}>
      <ScreenHeader title="Help & support" />
      <ScrollView contentContainerStyle={{ padding: 6, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.lead}>Need a hand? Reach us anytime at support@qizko.in or call +91 1800 123 456.</Text>
        <Text style={styles.section}>Frequently asked</Text>
        {FAQS.map((f) => (
          <View key={f.q} style={styles.card}>
            <Text style={styles.q}>{f.q}</Text>
            <Text style={styles.a}>{f.a}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  lead: { fontSize: 13, color: colors.mutedForeground, fontFamily: fonts.body, lineHeight: 20 },
  section: { fontSize: 16, fontFamily: fonts.displayBold, color: colors.foreground, marginTop: 16, marginBottom: 8 },
  card: { borderWidth: 1, borderColor: colors.border, padding: 10, marginBottom: 6, borderRadius: 0 },
  q: { fontSize: 14, fontFamily: fonts.heading, color: colors.foreground },
  a: { fontSize: 13, color: colors.mutedForeground, fontFamily: fonts.body, marginTop: 4, lineHeight: 19 },
});
