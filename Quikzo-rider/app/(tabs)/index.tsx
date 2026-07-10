import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Power, MapPin, Bell } from 'lucide-react-native';
import { colors, fonts, radius } from '@/lib/theme';
import LeafletMap from '@/components/LeafletMap';
import JobRequestCard from '@/components/JobRequestCard';
import BottomSheet from '@/components/BottomSheet';
import Skeleton from '@/components/Skeleton';
import { useSheet } from '@/lib/useSheet';
import { useJobs, nextIncoming } from '@/lib/jobStore';
import { useAuth } from '@/lib/authStore';
import { useInitialLoad } from '@/lib/useInitialLoad';
import { IncomingJob } from '@/lib/mockData';

const CENTER = { lat: 28.6139, lng: 77.2090 }; // New Delhi

export default function DispatchHome() {
    const insets = useSafeAreaInsets();
    const sheet = useSheet();
    const name = useAuth((s) => s.name);
    const loading = useInitialLoad();
    const locationGranted = useAuth((s) => s.locationGranted);
    const online = useJobs((s) => s.online);
    const setOnline = useJobs((s) => s.setOnline);
    const active = useJobs((s) => s.active);
    const acceptJob = useJobs((s) => s.acceptJob);

    const [incoming, setIncoming] = useState<IncomingJob | null>(null);

    // If a job is active, jump to the active-job screen.
    useEffect(() => { if (active) router.push('/active-job'); }, [active]);

    // While online with no active job, surface a new request every few seconds.
    useEffect(() => {
        if (!online || active || incoming) return;
        const t = setTimeout(() => setIncoming(nextIncoming()), 2500);
        return () => clearTimeout(t);
    }, [online, active, incoming]);

    const goOnline = () => {
        if (!locationGranted) {
            sheet.show({
                variant: 'warning',
                title: 'Enable live location',
                message: 'Turn on live location to start receiving jobs near you.',
                confirmText: 'Enable',
                cancelText: 'Not now',
                onConfirm: () => router.push('/vehicle-setup'),
            });
            return;
        }
        setOnline(true);
    };

    const goOffline = () => {
        sheet.show({
            variant: 'warning',
            title: 'Go offline?',
            message: incoming
                ? 'You have a pending job request. Going offline will decline it.'
                : 'You will stop receiving new job requests.',
            confirmText: 'Go offline',
            cancelText: 'Stay online',
            onConfirm: () => { setOnline(false); setIncoming(null); },
        });
    };

    const toggleOnline = () => (online ? goOffline() : goOnline());

    const onAccept = () => {
        if (!incoming) return;
        acceptJob(incoming);
        setIncoming(null);
    };

    const onDecline = () => setIncoming(null);

    return (
        <View style={styles.container}>
            <LeafletMap center={CENTER} showTraffic={online} style={StyleSheet.absoluteFill} />

            {/* Header — hello + city chip */}
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <View>
                    <Text style={styles.hello}>Hi, {name.split(' ')[0]}</Text>
                    <View style={styles.locRow}>
                        <MapPin size={11} color={colors.mutedForeground} />
                        <Text style={styles.loc}>New Delhi · Central</Text>
                    </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {online && (
                        <Pressable style={styles.onlinePill} onPress={goOffline} hitSlop={6}>
                            <View style={styles.onlineDot} />
                            <Text style={styles.onlinePillText}>Online</Text>
                            <View style={styles.onlinePillSep} />
                            <Power size={12} color={colors.accentForeground} strokeWidth={2.6} />
                        </Pressable>
                    )}
                    <Pressable style={styles.notifChip} onPress={() => router.push('/notifications')} hitSlop={6}>
                        <Bell size={16} color={colors.foreground} strokeWidth={2} />
                        <View style={styles.notifDot} />
                    </Pressable>
                </View>
            </View>

            {/* Bottom stack: incoming job (if any) or the online/offline card */}
            <View style={[styles.bottom, { paddingBottom: insets.bottom + 84 }]}>
                {loading ? (
                    <View style={styles.statusCard}>
                        <View style={{ flex: 1, gap: 8 }}>
                            <Skeleton width="55%" height={16} />
                            <Skeleton width="80%" height={11} />
                        </View>
                        <Skeleton width={110} height={44} rounded="pill" />
                    </View>
                ) : online && incoming ? (
                    <JobRequestCard job={incoming} onAccept={onAccept} onDecline={onDecline} />
                ) : (
                    <View style={styles.statusCard}>
                        <View style={styles.statusText}>
                            <Text style={styles.statusTitle}>
                                {online ? 'You are online' : 'You are offline'}
                            </Text>
                            <Text style={styles.statusSub}>
                                {online ? 'Waiting for a nearby job request…' : 'Go online to start receiving jobs.'}
                            </Text>
                        </View>
                        <Pressable
                            style={[styles.powerBtn, online && styles.powerBtnOn]}
                            onPress={toggleOnline}
                            hitSlop={6}
                        >
                            <Power size={22} color={online ? colors.accentForeground : colors.primaryForeground} strokeWidth={2.4} />
                            <Text style={[styles.powerText, online && styles.powerTextOn]}>
                                {online ? 'Go offline' : 'Go online'}
                            </Text>
                        </Pressable>
                    </View>
                )}
            </View>

            <BottomSheet visible={sheet.visible} {...sheet.config} onClose={sheet.hide} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
        position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 6, paddingBottom: 10,
        flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
        backgroundColor: 'rgba(240,237,229,0.92)', borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    hello: { fontSize: 16, fontFamily: fonts.displayBold, color: colors.foreground, letterSpacing: -0.3 },
    locRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
    loc: { fontSize: 11, color: colors.mutedForeground, fontFamily: fonts.body },
    notifChip: { width: 34, height: 34, borderRadius: radius.pill, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    notifDot: { position: 'absolute', top: 7, right: 7, width: 7, height: 7, borderRadius: 7, backgroundColor: colors.accent, borderWidth: 1, borderColor: colors.card },
    bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 6 },
    statusCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
    statusText: { flex: 1 },
    statusTitle: { fontSize: 15, fontFamily: fonts.displayBold, color: colors.foreground },
    statusSub: { fontSize: 12, fontFamily: fonts.body, color: colors.mutedForeground, marginTop: 3 },
    powerBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 12, borderRadius: radius.pill },
    powerBtnOn: { backgroundColor: colors.accent },
    powerText: { color: colors.primaryForeground, fontFamily: fonts.bodyBold, fontSize: 13, letterSpacing: 0.3 },
    powerTextOn: { color: colors.accentForeground },
    onlinePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.accent, paddingHorizontal: 10, paddingVertical: 7, borderRadius: radius.pill },
    onlineDot: { width: 7, height: 7, borderRadius: 7, backgroundColor: colors.success },
    onlinePillText: { fontSize: 11, fontFamily: fonts.bodyBold, color: colors.accentForeground, letterSpacing: 0.4, textTransform: 'uppercase' },
    onlinePillSep: { width: 1, height: 12, backgroundColor: 'rgba(0,0,0,0.15)' },
});
