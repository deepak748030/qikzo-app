import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import ScreenHeader from '@/components/ScreenHeader';
import { colors } from '@/lib/theme';
import { FileText } from 'lucide-react-native';

const SECTIONS = [
  { title: '1. Acceptance of Terms', body: 'By using this app, you agree to be bound by these terms. If you do not agree, please discontinue use of the app.' },
  { title: '2. Eligibility', body: 'You must be at least 18 years old to register and use the app. By registering, you confirm you meet this requirement.' },
  { title: '3. Account & Security', body: 'You are responsible for keeping your login credentials safe. Any activity under your account is your responsibility.' },
  { title: '4. Tasks & Rewards', body: 'Rewards are credited only when tasks are completed successfully and verified. We reserve the right to reject incomplete or fraudulent submissions.' },
  { title: '5. Withdrawals', body: 'Withdrawals are processed to verified payment methods. Processing time may vary based on the chosen method and bank.' },
  { title: '6. Prohibited Activities', body: 'Use of bots, fake accounts, or any manipulation of the reward system will result in immediate account termination and forfeiture of balance.' },
  { title: '7. Termination', body: 'We reserve the right to suspend or terminate accounts violating these terms without prior notice.' },
  { title: '8. Limitation of Liability', body: 'The app is provided "as is". We are not liable for indirect damages arising from your use of the service.' },
  { title: '9. Changes to Terms', body: 'These terms may be updated periodically. Continued use after changes constitutes acceptance of the updated terms.' },
  { title: '10. Governing Law', body: 'These terms are governed by applicable local laws. Disputes will be resolved through arbitration or local courts.' },
];

export default function TermsScreen() {
  return (
    <View style={styles.container}>
      <ScreenHeader title="Terms & Conditions" />
      <ScrollView contentContainerStyle={{ padding: 6, paddingBottom: 24 }}>
        <View style={styles.intro}>
          <View style={styles.iconWrap}><FileText size={22} color="#FFFFFF" /></View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.introTitle}>Terms of Service</Text>
            <Text style={styles.introSub}>Last updated: June 15, 2026</Text>
          </View>
        </View>

        <View style={styles.card}>
          {SECTIONS.map((s, i) => (
            <React.Fragment key={s.title}>
              {i > 0 && <View style={styles.sep} />}
              <View style={styles.block}>
                <Text style={styles.heading}>{s.title}</Text>
                <Text style={styles.body}>{s.body}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  intro: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, borderRadius: 6, padding: 12, marginTop: 4 },
  iconWrap: { width: 44, height: 44, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  introTitle: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  introSub: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 1 },
  card: { backgroundColor: colors.card, borderRadius: 6, borderWidth: 1, borderColor: colors.border, marginTop: 6, overflow: 'hidden' },
  block: { padding: 10 },
  heading: { color: colors.foreground, fontWeight: '700', fontSize: 13 },
  body: { color: colors.mutedForeground, fontSize: 12, lineHeight: 18, marginTop: 4 },
  sep: { height: 1, backgroundColor: colors.border },
});
