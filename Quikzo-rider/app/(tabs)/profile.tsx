import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { router, Href } from 'expo-router';
import { User, Bike, FileCheck2, Bell, HelpCircle, Info, Shield, FileText, LogOut, Star, Landmark } from 'lucide-react-native';
import { colors, fonts, radius } from '@/lib/theme';
import ScreenHeader from '@/components/ScreenHeader';
import BottomSheet from '@/components/BottomSheet';
import Skeleton from '@/components/Skeleton';
import { MenuRow } from '@/components/ui';
import { useSheet } from '@/lib/useSheet';
import { useAuth } from '@/lib/authStore';
import { useJobs } from '@/lib/jobStore';
import { useInitialLoad } from '@/lib/useInitialLoad';
import { stats } from '@/lib/mockData';

type Item = { icon: any; label: string; route: Href };

const ITEMS: Item[] = [
    { icon: User, label: 'Personal information', route: '/personal-info' },
    { icon: Landmark, label: 'Bank account & payouts', route: '/payout-details' },
    { icon: FileCheck2, label: 'Documents', route: '/documents' },
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
    const vehicle = useAuth((s) => s.vehicle);
    const vehicleNo = useAuth((s) => s.vehicleNo);
    const signOut = useAuth((s) => s.signOut);
    const setOnline = useJobs((s) => s.setOnline);
    const loading = useInitialLoad();

    const confirmLogout = () => {
        sheet.show({
            variant: 'warning',
            title: 'Log out?',
            message: 'You will need to verify your number again to log back in.',
            confirmText: 'Log out',
            cancelText: 'Cancel',
            onConfirm: () => { setOnline(false); signOut(); router.replace('/login'); },
        });
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="Profile" showBack={false} />
                <View style={{ paddingHorizontal: 6, paddingTop: 14, gap: 10 }}>
                    <Skeleton width="100%" height={78} rounded="md" />
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                        <Skeleton width="49%" height={70} rounded="sm" />
                        <Skeleton width="49%" height={70} rounded="sm" />
                    </View>
                    {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                        <Skeleton key={i} width="100%" height={44} rounded="sm" />
                    ))}
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScreenHeader title="Profile" showBack={false} />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Identity card */}
                <View style={styles.head}>
                    <View style={styles.avatar}><Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text></View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.name}>{name}</Text>
                        <Text style={styles.phone}>{phone || 'Not signed in'}</Text>
                    </View>
                    <View style={styles.rating}>
                        <Star size={12} color={colors.accent} fill={colors.accent} />
                        <Text style={styles.ratingText}>{stats.rating.toFixed(1)}</Text>
                    </View>
                </View>

                {/* Vehicle + lifetime stats strip */}
                <View style={styles.stripRow}>
                    <View style={styles.strip}>
                        <Bike size={16} color={colors.primary} />
                        <View>
                            <Text style={styles.stripLabel}>Vehicle</Text>
                            <Text style={styles.stripValue}>{vehicle}</Text>
                            <Text style={styles.stripSub}>{vehicleNo}</Text>
                        </View>
                    </View>
                    <View style={styles.strip}>
                        <FileCheck2 size={16} color={colors.primary} />
                        <View>
                            <Text style={styles.stripLabel}>Lifetime trips</Text>
                            <Text style={styles.stripValue}>{stats.lifetimeTrips.toLocaleString('en-IN')}</Text>
                            <Text style={styles.stripSub}>All verified</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.menu}>
                    {ITEMS.map((it) => (
                        <MenuRow key={it.label} icon={it.icon} label={it.label} onPress={() => router.push(it.route)} />
                    ))}
                    <MenuRow icon={LogOut} label="Log out" danger onPress={confirmLogout} />
                </View>

                <Text style={styles.version}>Qikzo Partner · v1.0.0</Text>
            </ScrollView>

            <BottomSheet visible={sheet.visible} {...sheet.config} onClose={sheet.hide} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card },
    avatar: { width: 52, height: 52, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
    avatarText: { color: colors.primaryForeground, fontFamily: fonts.displayBold, fontSize: 22 },
    name: { fontSize: 16, fontFamily: fonts.displayBold, color: colors.foreground },
    phone: { fontSize: 12, color: colors.mutedForeground, fontFamily: fonts.body, marginTop: 2 },
    rating: { flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 8, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: colors.background },
    ratingText: { fontSize: 12, fontFamily: fonts.displayBold, color: colors.foreground },
    stripRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 6, paddingTop: 6 },
    strip: { flex: 1, flexDirection: 'row', gap: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, padding: 10, borderRadius: radius.sm },
    stripLabel: { fontSize: 10, fontFamily: fonts.bodyBold, color: colors.mutedForeground, letterSpacing: 0.5, textTransform: 'uppercase' },
    stripValue: { fontSize: 13, fontFamily: fonts.bodyBold, color: colors.foreground, marginTop: 2 },
    stripSub: { fontSize: 10, fontFamily: fonts.body, color: colors.mutedForeground, marginTop: 1 },
    menu: { marginTop: 12, backgroundColor: colors.card, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
    version: { textAlign: 'center', fontSize: 11, color: colors.mutedForeground, fontFamily: fonts.body, marginTop: 18 },
});
