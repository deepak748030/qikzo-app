import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Copy, Share2, Gift } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { colors } from '@/lib/theme';
import { user } from '@/lib/mockData';

export default function ReferScreen() {
  const insets = useSafeAreaInsets();
  const [sharing, setSharing] = useState(false);

  const onCopy = async () => { await Clipboard.setStringAsync(user.referralCode); };
  const onShare = async () => {
    setSharing(true);
    setTimeout(() => setSharing(false), 800);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>Refer & Earn</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 6, paddingBottom: 24 }}>
        <View style={styles.illustration}>
          <View style={styles.giftCircle}><Gift size={48} color={colors.primary} /></View>
          <Text style={styles.bigTitle}>Invite Your Friends</Text>
          <Text style={styles.bigSub}>& Earn Unlimited</Text>
        </View>

        <View style={styles.codeBox}>
          <Text style={styles.codeLabel}>Your Referral Code</Text>
          <View style={styles.codeRow}>
            <Text style={styles.codeText}>{user.referralCode}</Text>
            <Pressable onPress={onCopy} hitSlop={10}>
              <Copy size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>
        </View>

        <Pressable style={styles.shareBtn} onPress={onShare} disabled={sharing}>
          {sharing ? <ActivityIndicator color="#FFFFFF" /> : (
            <>
              <Share2 size={16} color="#FFFFFF" />
              <Text style={styles.shareText}>Share Now</Text>
            </>
          )}
        </Pressable>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Referrals</Text>
            <Text style={styles.statValue}>{user.totalReferrals}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Referral Earnings</Text>
            <Text style={[styles.statValue, { color: colors.success }]}>₹ {user.referralEarnings.toFixed(2)}</Text>
          </View>
        </View>

        <Text style={styles.howTitle}>How it Works?</Text>
        {[
          { n: 1, t: 'Share your referral link', s: 'Share with your friends' },
          { n: 2, t: 'Your friend joins', s: 'Your friend signs up' },
          { n: 3, t: 'Both earn rewards', s: 'You and your friend get ₹20' },
        ].map((step) => (
          <View key={step.n} style={styles.stepRow}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>{step.n}</Text></View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.stepTitle}>{step.t}</Text>
              <Text style={styles.stepSub}>{step.s}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.primary, paddingHorizontal: 6, paddingBottom: 12, alignItems: 'center' },
  headerTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  illustration: { alignItems: 'center', paddingVertical: 16 },
  giftCircle: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: colors.chipBg,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  bigTitle: { color: colors.foreground, fontSize: 18, fontWeight: '800' },
  bigSub: { color: colors.foreground, fontSize: 18, fontWeight: '800' },
  codeBox: {
    backgroundColor: colors.card, borderRadius: 6, padding: 12,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', marginTop: 4,
  },
  codeLabel: { color: colors.mutedForeground, fontSize: 11, marginBottom: 4 },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  codeText: { color: colors.foreground, fontWeight: '800', fontSize: 20, letterSpacing: 2 },
  shareBtn: {
    flexDirection: 'row', backgroundColor: colors.primary, padding: 12, borderRadius: 6,
    alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4,
  },
  shareText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  statsRow: { flexDirection: 'row', gap: 4, marginTop: 4 },
  statCard: {
    flex: 1, backgroundColor: colors.card, padding: 10, borderRadius: 6,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  statLabel: { color: colors.mutedForeground, fontSize: 11 },
  statValue: { color: colors.foreground, fontWeight: '800', fontSize: 16, marginTop: 2 },
  howTitle: { color: colors.foreground, fontWeight: '700', fontSize: 14, marginTop: 12, marginBottom: 4 },
  stepRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card,
    padding: 10, borderRadius: 6, borderWidth: 1, borderColor: colors.border, marginTop: 4,
  },
  stepNum: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  stepNumText: { color: '#FFFFFF', fontWeight: '700' },
  stepTitle: { color: colors.foreground, fontWeight: '700', fontSize: 13 },
  stepSub: { color: colors.mutedForeground, fontSize: 11, marginTop: 1 },
});
