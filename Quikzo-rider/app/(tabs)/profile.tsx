import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { router, Href } from 'expo-router';
import { User, MapPin, Activity, HelpCircle, Info, Shield, FileText, ChevronRight, LogOut, Bell } from 'lucide-react-native';
import { colors, fonts, radius } from '@/lib/theme';
import ScreenHeader from '@/components/ScreenHeader';
import BottomSheet from '@/components/BottomSheet';
import { useSheet } from '@/lib/useSheet';
import { useAuth } from '@/lib/authStore';

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
  const signOut = useAuth((s) => s.signOut);

  const confirmLogout = () => {
    sheet.show({
      variant: 'warning',
      title: 'Log out?',
      message: 'You will need to verify your number again to log back in.',
      confirmText: 'Log out',
      cancelText: 'Cancel',
      onConfirm: () => { signOut(); router.replace('/login'); },
    });
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Profile"
        showBack={false}
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.head}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text></View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.phone}>{phone || 'Not signed in'}</Text>
          </View>

        </View>

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
  version: { textAlign: 'center', fontSize: 11, color: colors.mutedForeground, fontFamily: fonts.body, marginTop: 16 },
});
