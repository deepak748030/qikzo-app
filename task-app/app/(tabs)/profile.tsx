import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShieldCheck, User as UserIcon, CreditCard, Clock, HelpCircle, Info, LogOut, ChevronRight, Pencil } from 'lucide-react-native';
import { router } from 'expo-router';
import { colors } from '@/lib/theme';
import { user } from '@/lib/mockData';

const ITEMS = [
  { key: 'kyc', label: 'KYC Verification', Icon: ShieldCheck, color: '#22C55E', bg: '#DCFCE7', badge: 'Verified', route: '/kyc-verification' as const },
  { key: 'info', label: 'Personal Information', Icon: UserIcon, color: '#8B5CF6', bg: '#F3E8FF', route: '/personal-info' as const },
  { key: 'pay', label: 'Payment Details', Icon: CreditCard, color: '#F97316', bg: '#FFEDD5', route: '/payment-details' as const },
  { key: 'txn', label: 'Transaction History', Icon: Clock, color: '#2D6BFF', bg: '#DBEAFE', route: '/transaction-history' as const },
  { key: 'help', label: 'Help & Support', Icon: HelpCircle, color: '#EF4444', bg: '#FEE2E2', route: '/help-support' as const },
  { key: 'about', label: 'About Us', Icon: Info, color: '#6B7280', bg: '#F1F5F9', route: '/about-us' as const },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 6, paddingBottom: 24 }}>
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user.name.charAt(0)}</Text>
            </View>
            <View style={styles.editBadge}><Pencil size={10} color="#FFFFFF" /></View>
          </View>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.meta}>{user.email}</Text>
          <Text style={styles.meta}>{user.phone}</Text>
        </View>

        <View style={styles.menuCard}>
          {ITEMS.map((it, idx) => (
            <React.Fragment key={it.key}>
              {idx > 0 && <View style={styles.divider} />}
              <Pressable style={styles.row} onPress={() => it.route && router.push(it.route)}>
                <View style={[styles.rowIcon, { backgroundColor: it.bg }]}>
                  <it.Icon size={16} color={it.color} />
                </View>
                <Text style={styles.rowLabel}>{it.label}</Text>
                {it.badge && (
                  <View style={styles.verifiedPill}>
                    <Text style={styles.verifiedText}>{it.badge}</Text>
                  </View>
                )}
                <ChevronRight size={16} color={colors.mutedForeground} />
              </Pressable>
            </React.Fragment>
          ))}
        </View>

        <Pressable style={styles.logoutRow} onPress={() => router.replace('/login')}>
          <View style={[styles.rowIcon, { backgroundColor: '#FEE2E2' }]}>
            <LogOut size={16} color={colors.danger} />
          </View>
          <Text style={[styles.rowLabel, { color: colors.danger }]}>Logout</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.primary, paddingHorizontal: 6, paddingBottom: 12, alignItems: 'center' },
  headerTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  profileCard: {
    backgroundColor: colors.card, alignItems: 'center', paddingVertical: 16,
    borderRadius: 6, borderWidth: 1, borderColor: colors.border, marginTop: 6,
  },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFFFFF',
  },
  avatarText: { color: '#FFFFFF', fontWeight: '800', fontSize: 28 },
  editBadge: {
    position: 'absolute', bottom: 0, right: -2, width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#FFFFFF',
  },
  name: { color: colors.foreground, fontWeight: '800', fontSize: 16, marginTop: 6 },
  meta: { color: colors.mutedForeground, fontSize: 12, marginTop: 1 },
  menuCard: {
    backgroundColor: colors.card, borderRadius: 6, borderWidth: 1,
    borderColor: colors.border, marginTop: 6, overflow: 'hidden',
  },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 50 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 10, gap: 10,
  },
  rowIcon: { width: 30, height: 30, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, color: colors.foreground, fontSize: 13, fontWeight: '600' },
  verifiedPill: { backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  verifiedText: { color: colors.success, fontSize: 10, fontWeight: '700' },
  logoutRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card,
    padding: 10, borderRadius: 6, borderWidth: 1, borderColor: colors.border,
    marginTop: 6, gap: 10,
  },
});
