import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import ScreenHeader from '@/components/ScreenHeader';
import { colors } from '@/lib/theme';
import { ShieldCheck } from 'lucide-react-native';

const SECTIONS = [
  {
    title: '1. Information We Collect',
    body: 'We collect information you provide when you register, complete tasks, or contact support. This includes name, email, phone number, and payment details.',
  },
  {
    title: '2. How We Use Your Data',
    body: 'Your information is used to operate the app, process rewards, verify your identity, prevent fraud, and improve our services.',
  },
  {
    title: '3. Data Sharing',
    body: 'We do not sell your personal data. Limited information may be shared with payment processors and KYC partners to deliver our services.',
  },
  {
    title: '4. Data Security',
    body: 'We use industry-standard encryption and access controls to protect your data. No method is 100% secure, but we work hard to safeguard your information.',
  },
  {
    title: '5. Your Rights',
    body: 'You can request access, correction, or deletion of your personal data at any time by contacting our support team.',
  },
  {
    title: '6. Cookies & Tracking',
    body: 'We use minimal tracking to remember preferences and improve user experience. You can manage tracking from device settings.',
  },
  {
    title: '7. Changes to this Policy',
    body: 'We may update this policy from time to time. Updates will be posted in the app with the revised date.',
  },
  {
    title: '8. Contact Us',
    body: 'For questions about this policy, reach us through Help & Support inside the app.',
  },
];

export default function PrivacyPolicyScreen() {
  return (
    <View style={styles.container}>
      <ScreenHeader title="Privacy Policy" />
      <ScrollView contentContainerStyle={{ padding: 6, paddingBottom: 24 }}>
        <View style={styles.intro}>
          <View style={styles.iconWrap}><ShieldCheck size={22} color="#FFFFFF" /></View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.introTitle}>Your Privacy Matters</Text>
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
