import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import * as Location from 'expo-location';
import { Power, Bell, ShieldAlert } from 'lucide-react-native';
import { ridersApi } from '@/lib/api/endpoints/riders';
import { api } from '@/lib/api';
import type { EarningsSummary } from '@/lib/api/endpoints/earnings';
import { colors, fonts, radius } from '@/lib/theme';
import JobRequestCard from '@/components/JobRequestCard';
import BottomSheet from '@/components/BottomSheet';
import Skeleton from '@/components/Skeleton';
import { StatCol, StatDivider } from '@/components/ui';
import { useSheet } from '@/lib/useSheet';
import { useJobs, nextIncoming } from '@/lib/jobStore';
import { useAuth } from '@/lib/authStore';
import { useInitialLoad } from '@/lib/useInitialLoad';
import { IncomingJob } from '@/lib/mockData';
import { tokenStore } from '@/lib/api/tokenStore';
import { ApiError } from '@/lib/api/errors';
import { subscribe as subscribeSocket, connectSocket } from '@/lib/socket';

const LOCATION_INTERVAL_MS = 10_000;
const INCOMING_POLL_MS = 10_000;

let lastNavActiveKey: string | null = null;

export default function DispatchHome() {
    const insets = useSafeAreaInsets();
    const sheet = useSheet();
    const name = useAuth((s) => s.name);
    const loading = useInitialLoad();
    const locationGranted = useAuth((s) => s.locationGranted);
    const setLocationGranted = useAuth((s) => s.setLocationGranted);
    const online = useJobs((s) => s.online);
    const setOnline = useJobs((s) => s.setOnline);
    const setOnlineOnServer = useJobs((s) => s.setOnlineOnServer);
    const pushLocation = useJobs((s) => s.pushLocation);
    const fetchIncoming = useJobs((s) => s.fetchIncoming);
    const acceptFromServer = useJobs((s) => s.acceptFromServer);
    const declineFromServer = useJobs((s) => s.declineFromServer);
    const hydrateActiveFromServer = useJobs((s) => s.hydrateActiveFromServer);
    const active = useJobs((s) => s.active);

    const [incoming, setIncoming] = useState<IncomingJob[]>([]);
    const [acceptBusyId, setAcceptBusyId] = useState<string | null>(null);
    const [kycStatus, setKycStatus] = useState<string | null>(null);
    const [today, setToday] = useState<Pick<EarningsSummary, 'today' | 'todayTrips' | 'todayHours'> | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const isSignedIn = () => !!tokenStore.get().accessToken;

    const loadToday = useCallback(async () => {
        if (!isSignedIn()) { setToday({ today: 0, todayTrips: 0, todayHours: 0 }); return; }
        try {
            const s = await api.earnings.summary();
            setToday({ today: s.today, todayTrips: s.todayTrips, todayHours: s.todayHours });
        } catch { /* keep last */ }
    }, []);

    useEffect(() => { hydrateActiveFromServer(); }, [hydrateActiveFromServer]);

    const refreshKyc = React.useCallback(async () => {
        if (!isSignedIn()) return;
        try {
            const rider = await ridersApi.me();
            const status = (rider as any)?.kycStatus ?? null;
            setKycStatus(status);
            if (status !== 'approved' && (rider as any)?.online) {
                try { await setOnlineOnServer(false); } catch { /* ignore */ }
            }
        } catch { /* ignore */ }
    }, [setOnlineOnServer]);
    useEffect(() => { refreshKyc(); loadToday(); }, [refreshKyc, loadToday]);

    useFocusEffect(useCallback(() => {
        loadToday();
        hydrateActiveFromServer();
    }, [loadToday, hydrateActiveFromServer]));

    useEffect(() => {
        connectSocket();
        const off = subscribeSocket('kyc:update', (payload: any) => {
            if (payload?.kycStatus) setKycStatus(String(payload.kycStatus));
            refreshKyc();
        });
        return () => { off(); };
    }, [refreshKyc]);

    useEffect(() => {
        const key = active ? String(active.tripId || active.id || '') : '';
        if (!key) { lastNavActiveKey = null; return; }
        if (lastNavActiveKey === key) return;
        lastNavActiveKey = key;
        router.replace('/active-job');
    }, [active]);

    // Location heartbeat — still needed so nearby incoming can $near-filter.
    useEffect(() => {
        if (!online || !isSignedIn()) return;
        let stopped = false;
        const tick = async () => {
            try {
                const { status } = await Location.getForegroundPermissionsAsync();
                if (status !== 'granted') return;
                const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                if (stopped) return;
                await pushLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
            } catch { /* ignore */ }
        };
        tick();
        const t = setInterval(tick, LOCATION_INTERVAL_MS);
        return () => { stopped = true; clearInterval(t); };
    }, [online, pushLocation]);

    const cancelledIdsRef = useRef<Set<string>>(new Set());

    const pullIncoming = useCallback(async () => {
        if (isSignedIn()) {
            const items = await fetchIncoming();
            const fresh = items.filter((it: any) => !cancelledIdsRef.current.has(String(it.id)));
            setIncoming(fresh);
        } else {
            setIncoming([nextIncoming()]);
        }
    }, [fetchIncoming]);

    // Keep polling the full list while online — new offers append in realtime.
    useEffect(() => {
        if (!online || active) return;
        let cancelled = false;
        const pull = async () => {
            if (cancelled) return;
            await pullIncoming();
        };
        pull();
        const t = setInterval(pull, INCOMING_POLL_MS);
        connectSocket();
        const offOffer = subscribeSocket('job:offer', () => { if (!cancelled) pull(); });
        return () => { cancelled = true; clearInterval(t); offOffer(); };
    }, [online, active, pullIncoming]);

    useEffect(() => {
        if (!online) return;
        connectSocket();
        const off = subscribeSocket('job:cancelled', (p: any) => {
            if (!p?.id) return;
            const cancelledId = String(p.id);
            cancelledIdsRef.current.add(cancelledId);
            setIncoming((cur) => cur.filter((j) => String(j.id) !== cancelledId));
        });
        return () => { off(); };
    }, [online]);

    useEffect(() => {
        if (!online || incoming.length === 0 || !isSignedIn()) return;
        let cancelled = false;
        const verify = async () => {
            try {
                const items = await fetchIncoming();
                if (cancelled) return;
                const live = new Set(items.map((it: any) => String(it.id)));
                setIncoming((cur) => {
                    const next = cur.filter((j) => live.has(String(j.id)));
                    cur.forEach((j) => {
                        if (!live.has(String(j.id))) cancelledIdsRef.current.add(String(j.id));
                    });
                    return next;
                });
            } catch { /* ignore */ }
        };
        const first = setTimeout(verify, 2000);
        const t = setInterval(verify, 3000);
        return () => { cancelled = true; clearTimeout(first); clearInterval(t); };
    }, [online, incoming.length, fetchIncoming]);

    const goOnline = async () => {
        if (isSignedIn()) {
            let status = kycStatus;
            if (!status) {
                try {
                    const rider = await ridersApi.me();
                    status = ((rider as any)?.kycStatus ?? null) as string | null;
                    setKycStatus(status);
                } catch {
                    sheet.show({ variant: 'error', title: 'Please try again', message: 'Could not verify your KYC status. Check your connection and retry.' });
                    return;
                }
            }
            if (status !== 'approved') {
                sheet.show({
                    variant: 'warning',
                    title: 'KYC verification needed',
                    message: status === 'pending' || status === 'submitted'
                        ? 'Your documents are under review. You can go online once KYC is approved.'
                        : 'Upload and verify your documents before going online.',
                    confirmText: 'Open documents',
                    cancelText: 'Later',
                    onConfirm: () => router.push('/documents'),
                });
                return;
            }
        }
        if (!locationGranted) {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                sheet.show({
                    variant: 'warning',
                    title: 'Enable live location',
                    message: 'Turn on live location to start receiving jobs near you.',
                });
                return;
            }
            setLocationGranted(true);
        }
        if (isSignedIn()) {
            try {
                await setOnlineOnServer(true);
                try {
                    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                    await pushLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
                } catch { /* ignore */ }
            } catch (e) {
                const msg = e instanceof ApiError ? e.message : 'Could not go online.';
                const code = (e instanceof ApiError ? e.code : '') || '';
                if (code === 'KYC_NOT_APPROVED') {
                    refreshKyc();
                    sheet.show({
                        variant: 'warning',
                        title: 'KYC verification needed',
                        message: 'Upload and verify your documents before going online.',
                        confirmText: 'Open documents',
                        cancelText: 'Later',
                        onConfirm: () => router.push('/documents'),
                    });
                } else {
                    sheet.show({ variant: 'error', title: 'Failed to go online', message: msg });
                }
                return;
            }
        } else {
            setOnline(true);
        }
    };

    const goOffline = () => {
        sheet.show({
            variant: 'warning',
            title: 'Go offline?',
            message: incoming.length
                ? 'You have pending job requests. Going offline will decline them.'
                : 'You will stop receiving new job requests.',
            confirmText: 'Go offline',
            cancelText: 'Stay online',
            onConfirm: async () => {
                if (isSignedIn()) { try { await setOnlineOnServer(false); } catch { /* ignore */ } }
                else { setOnline(false); }
                setIncoming([]);
            },
        });
    };

    const toggleOnline = () => (online ? goOffline() : goOnline());

    const onAccept = async (job: IncomingJob) => {
        if (!isSignedIn()) {
            useJobs.getState().acceptJob(job);
            setIncoming([]);
            return;
        }
        setAcceptBusyId(job.id);
        try {
            await acceptFromServer(job.id);
            setIncoming([]);
        } catch (e) {
            const msg = e instanceof ApiError ? e.message : 'Could not accept the job.';
            sheet.show({ variant: 'error', title: 'Accept failed', message: msg });
        } finally {
            setAcceptBusyId(null);
        }
    };

    const onDecline = async (job: IncomingJob) => {
        if (isSignedIn()) {
            await declineFromServer(job.id, 'Rider declined');
        }
        cancelledIdsRef.current.add(String(job.id));
        setIncoming((cur) => cur.filter((j) => j.id !== job.id));
    };

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await Promise.all([loadToday(), hydrateActiveFromServer(), online ? pullIncoming() : Promise.resolve()]);
        } finally {
            setRefreshing(false);
        }
    };

    const earnings = today?.today ?? 0;
    const trips = today?.todayTrips ?? 0;
    const hours = today?.todayHours ?? 0;

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.hello}>Hi, {name.split(' ')[0]}</Text>
                    <Text style={styles.loc}>{online ? 'Receiving nearby requests' : 'You are offline'}</Text>
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

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: insets.bottom + 110, paddingHorizontal: 6 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
            >
                {loading ? (
                    <View style={{ gap: 8, marginTop: 10 }}>
                        <Skeleton width="100%" height={72} rounded="md" />
                        <Skeleton width="100%" height={88} rounded="md" />
                        <Skeleton width="100%" height={160} rounded="md" />
                    </View>
                ) : (
                    <>
                        <View style={styles.strip}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.stripLabel}>Today</Text>
                                <Text style={styles.stripValue}>₹{earnings.toLocaleString('en-IN')}</Text>
                            </View>
                            <StatDivider />
                            <StatCol label="Trips" value={String(trips)} />
                            <StatDivider />
                            <StatCol label="Online" value={`${hours.toFixed(1)}h`} />
                        </View>

                        {kycStatus && kycStatus !== 'approved' ? (
                            <Pressable onPress={() => router.push('/documents')} style={styles.kycBanner}>
                                <ShieldAlert size={16} color={colors.danger} strokeWidth={2.4} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.kycTitle}>
                                        {kycStatus === 'pending' ? 'KYC under review' : 'KYC not verified'}
                                    </Text>
                                    <Text style={styles.kycSub}>
                                        {kycStatus === 'pending'
                                            ? 'You can go online once your documents are approved.'
                                            : 'Upload your documents to start receiving jobs.'}
                                    </Text>
                                </View>
                                <Text style={styles.kycCta}>Fix</Text>
                            </Pressable>
                        ) : null}

                        {!online ? (
                            <View style={styles.statusCard}>
                                <View style={styles.statusText}>
                                    <Text style={styles.statusTitle}>You are offline</Text>
                                    <Text style={styles.statusSub}>
                                        {kycStatus && kycStatus !== 'approved'
                                            ? 'Verify KYC to start receiving jobs.'
                                            : 'Go online to start receiving pickup requests.'}
                                    </Text>
                                </View>
                                <Pressable
                                    style={[
                                        styles.powerBtn,
                                        kycStatus && kycStatus !== 'approved' && styles.powerBtnDisabled,
                                    ]}
                                    onPress={toggleOnline}
                                    hitSlop={6}
                                >
                                    <Power size={22} color={colors.primaryForeground} strokeWidth={2.4} />
                                    <Text style={styles.powerText}>Go online</Text>
                                </Pressable>
                            </View>
                        ) : (
                            <>
                                <View style={styles.sectionRow}>
                                    <Text style={styles.section}>Pickup requests</Text>
                                    <Text style={styles.count}>{incoming.length}</Text>
                                </View>
                                {incoming.length === 0 ? (
                                    <View style={styles.empty}>
                                        <Text style={styles.emptyTitle}>Waiting for requests</Text>
                                        <Text style={styles.emptySub}>Nearby pickup jobs will appear here in realtime.</Text>
                                        <Pressable style={styles.offlineLink} onPress={goOffline} hitSlop={6}>
                                            <Text style={styles.offlineLinkText}>Go offline</Text>
                                        </Pressable>
                                    </View>
                                ) : (
                                    <View style={styles.grid}>
                                        {incoming.map((job) => (
                                            <JobRequestCard
                                                key={job.id}
                                                job={job}
                                                onAccept={() => onAccept(job)}
                                                onDecline={() => onDecline(job)}
                                                accepting={acceptBusyId === job.id}
                                            />
                                        ))}
                                    </View>
                                )}
                            </>
                        )}
                    </>
                )}
            </ScrollView>

            <BottomSheet visible={sheet.visible} {...sheet.config} onClose={sheet.hide} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
        paddingHorizontal: 6, paddingBottom: 10,
        flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
        backgroundColor: colors.headerBg, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    hello: { fontSize: 16, fontFamily: fonts.displayBold, color: colors.foreground, letterSpacing: -0.3 },
    loc: { fontSize: 11, color: colors.mutedForeground, fontFamily: fonts.body, marginTop: 3 },
    notifChip: { width: 34, height: 34, borderRadius: radius.pill, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    notifDot: { position: 'absolute', top: 7, right: 7, width: 7, height: 7, borderRadius: 7, backgroundColor: colors.accent, borderWidth: 1, borderColor: colors.card },
    strip: {
        flexDirection: 'row', alignItems: 'center', marginTop: 10, padding: 12,
        backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    },
    stripLabel: { fontSize: 10, fontFamily: fonts.bodyBold, color: colors.mutedForeground, letterSpacing: 0.5, textTransform: 'uppercase' },
    stripValue: { fontSize: 16, fontFamily: fonts.displayBold, color: colors.foreground, marginTop: 3, letterSpacing: -0.3 },
    sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 8, paddingHorizontal: 6 },
    section: { fontSize: 11, fontFamily: fonts.bodyBold, color: colors.mutedForeground, letterSpacing: 0.6, textTransform: 'uppercase' },
    count: { fontSize: 11, fontFamily: fonts.displayBold, color: colors.primary },
    grid: { gap: 8 },
    empty: {
        alignItems: 'center', paddingVertical: 28, paddingHorizontal: 16,
        backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, gap: 6,
    },
    emptyTitle: { fontSize: 14, fontFamily: fonts.displayBold, color: colors.foreground },
    emptySub: { fontSize: 12, fontFamily: fonts.body, color: colors.mutedForeground, textAlign: 'center' },
    offlineLink: { marginTop: 8, paddingVertical: 6, paddingHorizontal: 12 },
    offlineLinkText: { fontSize: 12, fontFamily: fonts.bodyBold, color: colors.mutedForeground },
    statusCard: {
        marginTop: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
        borderRadius: radius.md, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
    },
    statusText: { flex: 1 },
    statusTitle: { fontSize: 15, fontFamily: fonts.displayBold, color: colors.foreground },
    statusSub: { fontSize: 12, fontFamily: fonts.body, color: colors.mutedForeground, marginTop: 3 },
    powerBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 12, borderRadius: radius.pill },
    powerBtnDisabled: { opacity: 0.55 },
    powerText: { color: colors.primaryForeground, fontFamily: fonts.bodyBold, fontSize: 13, letterSpacing: 0.3 },
    kycBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10,
        backgroundColor: colors.card, borderWidth: 1, borderColor: colors.danger,
        borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10,
    },
    kycTitle: { fontSize: 13, fontFamily: fonts.displayBold, color: colors.foreground },
    kycSub: { fontSize: 11, fontFamily: fonts.body, color: colors.mutedForeground, marginTop: 2 },
    kycCta: { fontSize: 12, fontFamily: fonts.bodyBold, color: colors.danger, letterSpacing: 0.4, textTransform: 'uppercase' },
    onlinePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.accent, paddingHorizontal: 10, paddingVertical: 7, borderRadius: radius.pill },
    onlineDot: { width: 7, height: 7, borderRadius: 7, backgroundColor: colors.success },
    onlinePillText: { fontSize: 11, fontFamily: fonts.bodyBold, color: colors.accentForeground, letterSpacing: 0.4, textTransform: 'uppercase' },
    onlinePillSep: { width: 1, height: 12, backgroundColor: 'rgba(0,0,0,0.15)' },
});
