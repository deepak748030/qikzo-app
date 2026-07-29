import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { router, Href } from 'expo-router';
import { User, MapPin, Activity, HelpCircle, Info, Shield, FileText, ChevronRight, LogOut, Bell, Wallet as WalletIcon, Gift } from 'lucide-react-native';
import { colors, fonts, radius } from '@/lib/theme';
import ScreenHeader from '@/components/ScreenHeader';
import BottomSheet from '@/components/BottomSheet';
import { useSheet } from '@/lib/useSheet';
import { useAuth } from '@/lib/authStore';
import { useBooking } from '@/lib/bookingStore';
import Skeleton from '@/components/Skeleton';
import { useInitialLoad } from '@/lib/useInitialLoad';
import { authApi } from '@/lib/api/endpoints/auth';
import { tokenStore } from '@/lib/api/tokenStore';
import { walletApi, type WalletSummary } from '@/lib/api/endpoints/wallet';


type Item = { icon: any; label: string; route?: Href };

const ITEMS: Item[] = [
  { icon: User, label: 'Personal information', route: '/personal-info' },
  { icon: Activity, label: 'My bookings', route: '/(tabs)/activity' },
  { icon: Bell, label: 'Notifications', route: '/notifications' },
  { icon: HelpCircle, label: 'Help & support', route: '/help-support' },
  { icon: Info, label: 'About us', route: '/about-us' },
  { icon: Shield, label: 'Privacy policy', route: '/privacy-policy' },
  { icon: FileText, label: 'Terms & conditions', route: '/terms-conditions' },
];

export default function ProfileScreen() {
  const sheet = useSheet();
  const name = useAuth((s) => s.name);
  const phone = useAuth((s) => s.phone);
  const setSession = useAuth((s) => s.setSession);
  const signOut = useAuth((s) => s.signOut);
  const loading = useInitialLoad();
  const [wallet, setWallet] = useState<WalletSummary | null>(null);

  // Reconcile with the server on mount so the profile card always reflects
  // truth (name updates, phone changes, admin edits).
  useEffect(() => {
    if (!tokenStore.get().accessToken) return;
    let cancelled = false;
    authApi.me().then((u) => {
      if (cancelled || !u) return;
      setSession({
        id: (u as any)._id || u.id,
        name: u.name && u.name !== 'Guest' ? u.name : undefined,
        phone: u.phone ? `+91 ${String(u.phone).replace(/^\+?91/, '')}` : undefined,
      });
    }).catch(() => { /* 401 already handled by client refresh dance */ });
    return () => { cancelled = true; };
  }, [setSession]);

  // Fetch wallet balances so the card on the profile screen is always fresh.
  useEffect(() => {
    if (!tokenStore.get().accessToken) return;
    let cancelled = false;
    walletApi.summary().then((s) => { if (!cancelled) setWallet(s); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);


  const confirmLogout = () => {
    // Block logout while a booking is still in progress — otherwise the
    // rider keeps riding to a customer who has no way to see the trip.
    const ACTIVE = ['Searching rider', 'Rider accepted', 'Arriving for pickup', 'Picked up', 'On the way'];
    const active = useBooking.getState().bookings.find((b) => ACTIVE.includes(b.status));
    if (active) {
      sheet.show({
        variant: 'warning',
        title: 'Active ride in progress',
        message: `Booking ${active.id} is still ${active.status.toLowerCase()}. Cancel or complete it before logging out.`,
        confirmText: 'View booking',
        cancelText: 'Stay signed in',
        onConfirm: () => { try { router.push({ pathname: '/booking-details', params: { id: active.id } }); } catch {} },
      });
      return;
    }
    sheet.show({
      variant: 'warning',
      title: 'Log out?',
      message: 'You will need to verify your number again to log back in.',
      confirmText: 'Log out',
      cancelText: 'Cancel',
      onConfirm: async () => { await signOut(); router.replace('/login'); },
    });
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Profile"
        showBack={false}
      />
      {loading ? (
        <View style={{ padding: 6, gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 }}>
            <Skeleton width={48} height={48} rounded="sm" />
            <View style={{ flex: 1, gap: 6 }}>
              <Skeleton width="55%" height={14} />
              <Skeleton width="40%" height={11} />
            </View>
          </View>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Skeleton key={i} width="100%" height={44} rounded="sm" />
          ))}
        </View>
      ) : (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.head}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text></View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.phone}>{phone || 'Not signed in'}</Text>
          </View>

        </View>

        {/* Wallet — two balances (Money + Loyalty) with zero gap between them.
            Tap to open the full wallet screen. */}
        <Pressable style={styles.walletCard} onPress={() => router.push('/wallet' as Href)}>
          <View style={styles.walletHalf}>
            <View style={styles.walletHead}>
              <WalletIcon size={13} color={colors.mutedForeground} />
              <Text style={styles.walletLabel}>Money</Text>
            </View>
            <Text style={styles.walletAmount}>₹{wallet?.money.balance?.toFixed(0) ?? '0'}</Text>
          </View>
          <View style={styles.walletDivider} />
          <View style={styles.walletHalf}>
            <View style={styles.walletHead}>
              <Gift size={13} color={colors.mutedForeground} />
              <Text style={styles.walletLabel}>Loyalty</Text>
            </View>
            <Text style={styles.walletAmount}>₹{wallet?.loyalty.balance?.toFixed(0) ?? '0'}</Text>
          </View>
          <ChevronRight size={18} color={colors.mutedForeground} style={{ marginRight: 8 }} />
        </Pressable>

        <View style={styles.menu}>

          {ITEMS.map((it) => (
            <Pressable key={it.label} style={styles.menuRow} onPress={() => it.route && router.push(it.route)}>
              <it.icon size={20} color={colors.foreground} />
              <Text style={styles.menuLabel}>{it.label}</Text>
              <ChevronRight size={18} color={colors.mutedForeground} />
            </Pressable>
          ))}
          <Pressable style={styles.menuRow} onPress={confirmLogout}>
            <LogOut size={18} color={colors.danger} />
            <Text style={[styles.menuLabel, { color: colors.danger }]}>Log out</Text>
            <ChevronRight size={18} color={colors.mutedForeground} />
          </Pressable>
        </View>

        <Text style={styles.version}>Qikzo v1.0.0</Text>
      </ScrollView>
      )}

      <BottomSheet visible={sheet.visible} {...sheet.config} onClose={sheet.hide} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  avatar: { width: 48, height: 48, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  avatarText: { color: colors.primaryForeground, fontFamily: fonts.displayBold, fontSize: 20 },
  name: { fontSize: 16, fontFamily: fonts.displayBold, color: colors.foreground },
  phone: { fontSize: 12, color: colors.mutedForeground, fontFamily: fonts.body, marginTop: 2 },
  addrChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 0 },
  addrText: { fontSize: 12, fontFamily: fonts.bodyBold, color: colors.foreground },
  menu: { marginTop: 6 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: colors.divider },
  menuLabel: { flex: 1, fontSize: 14, fontFamily: fonts.body, color: colors.foreground },
  // Wallet card — zero gap between Money and Loyalty per spec.
  walletCard: {
    flexDirection: 'row', alignItems: 'center', marginTop: 0, marginHorizontal: 0,
    borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card,
  },
  walletHalf: { flex: 1, padding: 12, gap: 4 },
  walletDivider: { width: 1, alignSelf: 'stretch', backgroundColor: colors.border },
  walletHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  walletLabel: { fontSize: 10, fontFamily: fonts.bodyBold, color: colors.mutedForeground, letterSpacing: 0.4, textTransform: 'uppercase' },
  walletAmount: { fontSize: 18, fontFamily: fonts.displayBold, color: colors.foreground },
  version: { textAlign: 'center', fontSize: 11, color: colors.mutedForeground, fontFamily: fonts.body, marginTop: 16 },
});
