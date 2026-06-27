import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, fonts } from '@/lib/theme';
import ScreenHeader from '@/components/ScreenHeader';

const FAQS = [
  { q: 'How does Qikzo work?', a: 'Set your pickup and drop locations, add a note for what to fetch, confirm — and a nearby rider picks it up and delivers it to you.' },
  { q: 'How is the price calculated?', a: 'A base fare of ₹25 plus ₹8 per kilometre of distance between pickup and drop. The total is shown before you confirm.' },
  { q: 'Can I send anything?', a: 'Yes — groceries, food, medicines, parcels and documents. Illegal items, hazardous materials and alcohol are not allowed.' },
  { q: 'How do I track my booking?', a: 'Open the Activity tab and tap your booking to see live status, rider details and trip timeline.' },
  { q: 'Can I cancel a booking?', a: 'Yes, you can cancel before the rider picks up your items, from the booking details screen.' },
  { q: 'Which payment methods are accepted?', a: 'Cash and UPI are supported today. Card payments are coming soon.' },
];

export default function HelpSupport() {
  return (
    <View style={styles.container}>
      <ScreenHeader title="Help & support" />
      <ScrollView contentContainerStyle={{ padding: 6, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.lead}>Need a hand? Reach us anytime at support@qikzo.in or call +91 1800 123 456.</Text>
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
