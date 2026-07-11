import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { Power, MapPin, Bell, ShieldAlert } from 'lucide-react-native';
import { ridersApi } from '@/lib/api/endpoints/riders';
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
import { tokenStore } from '@/lib/api/tokenStore';
import { ApiError } from '@/lib/api/errors';
import { subscribe as subscribeSocket, connectSocket } from '@/lib/socket';

const FALLBACK_CENTER = { lat: 28.6139, lng: 77.2090 }; // Only used until GPS resolves.
const LOCATION_INTERVAL_MS = 10_000;   // heartbeat while online
const INCOMING_POLL_MS = 5_000;         // job-request feed poll

// Module-scoped so the "already navigated for this trip" guard survives
// Home unmount/remount cycles caused by router.replace('/(tabs)').
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

    const [incoming, setIncoming] = useState<IncomingJob | null>(null);
    const [acceptBusy, setAcceptBusy] = useState(false);
    const [kycStatus, setKycStatus] = useState<string | null>(null);
    // Live GPS center for the map — resolves as soon as permission is granted.
    const [center, setCenter] = useState(FALLBACK_CENTER);

    // Resolve the rider's real location on mount so the map isn't stuck on Delhi.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                let { status } = await Location.getForegroundPermissionsAsync();
                if (status !== 'granted') {
                    const req = await Location.requestForegroundPermissionsAsync();
                    status = req.status;
                }
                if (status !== 'granted') return;
                const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                if (!cancelled) setCenter({ lat: loc.coords.latitude, lng: loc.coords.longitude });
            } catch { /* ignore */ }
        })();
        return () => { cancelled = true; };
    }, []);

    // Auth-aware helpers — real online/toggle when signed in, mock in preview.
    const isSignedIn = () => !!tokenStore.get().accessToken;

    // On mount: resume an in-flight trip from the server (survives app restart).
    useEffect(() => { hydrateActiveFromServer(); }, [hydrateActiveFromServer]);

    // Fetch KYC status so we can gate "Go online" client-side and surface a banner.
    // The server also enforces this (returns KYC_NOT_APPROVED) — this is UX only.
    const refreshKyc = React.useCallback(async () => {
        if (!isSignedIn()) return;
        try {
            const rider = await ridersApi.me();
            const status = (rider as any)?.kycStatus ?? null;
            setKycStatus(status);
            // Safety: if the server somehow has us online while KYC isn't approved, force offline.
            if (status !== 'approved' && (rider as any)?.online) {
                try { await setOnlineOnServer(false); } catch { /* ignore */ }
            }
        } catch { /* ignore */ }
    }, [setOnlineOnServer]);
    useEffect(() => { refreshKyc(); }, [refreshKyc]);

    // Realtime KYC updates via socket so the banner + Go-online gate flip the
    // instant an admin approves/rejects, no refresh needed.
    useEffect(() => {
        connectSocket();
        const off = subscribeSocket('kyc:update', (payload: any) => {
            if (payload?.kycStatus) setKycStatus(String(payload.kycStatus));
            refreshKyc();
        });
        return () => { off(); };
    }, [refreshKyc]);

    // If a job is active, jump to the active-job screen — but only ONCE per
    // trip. `lastNavActiveKey` is module-scoped so it survives Home remounts
    // (e.g. after pressing X on Active Job → router.replace('/(tabs)')),
    // preventing the blink/loop where Home re-pushes on every remount.
    useEffect(() => {
        const key = active ? String(active.tripId || active.id || '') : '';
        if (!key) { lastNavActiveKey = null; return; }
        if (lastNavActiveKey === key) return;
        lastNavActiveKey = key;
        // replace (not push) so back-stack doesn't fill with duplicates.
        router.replace('/active-job');
    }, [active]);

    // Location heartbeat: while online, push GPS every ~10s so the server-side
    // /riders/me/incoming query can $near-filter correctly.
    useEffect(() => {
        if (!online || !isSignedIn()) return;
        let stopped = false;
        const tick = async () => {
            try {
                const { status } = await Location.getForegroundPermissionsAsync();
                if (status !== 'granted') return;
                const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                if (stopped) return;
                const next = { lat: loc.coords.latitude, lng: loc.coords.longitude };
                setCenter(next);
                await pushLocation(next);
            } catch { /* ignore */ }
        };
        tick();
        const t = setInterval(tick, LOCATION_INTERVAL_MS);
        return () => { stopped = true; clearInterval(t); };
    }, [online, pushLocation]);

    // Track bookings the server told us are cancelled so we don't re-show
    // them if a poll response is already in flight when the cancel arrives.
    const cancelledIdsRef = useRef<Set<string>>(new Set());

    // Incoming-jobs poller (fallback) + realtime job:offer push.
    useEffect(() => {
        if (!online || active || incoming) return;
        let cancelled = false;
        const pull = async () => {
            if (isSignedIn()) {
                const items = await fetchIncoming();
                if (cancelled) return;
                // Drop any items already known-cancelled (race: cancel event
                // fired while this poll was in flight).
                const fresh = items.filter((it: any) => !cancelledIdsRef.current.has(String(it.id)));
                if (fresh.length) setIncoming(fresh[0]);
            } else if (!cancelled) {
                setIncoming(nextIncoming());
            }
        };
        // 1) Kick off immediately, then poll every 5s as a safety net if socket is down.
        pull();
        const t = setInterval(pull, INCOMING_POLL_MS);
        // 2) Realtime: on job:offer instantly try to grab a fresh incoming.
        connectSocket();
        const offOffer = subscribeSocket('job:offer', () => { if (!cancelled) pull(); });
        // 3) If the customer cancels (or someone else takes it) drop the card
        //    immediately. Use functional setState so we always compare against
        //    the latest incoming — even if this handler was registered before
        //    setIncoming ran. Also remember the id to filter in-flight polls.
        const offCancel = subscribeSocket('job:cancelled', (p: any) => {
            if (cancelled || !p?.id) return;
            const cancelledId = String(p.id);
            cancelledIdsRef.current.add(cancelledId);
            setIncoming((cur) => (cur && String((cur as any).id) === cancelledId ? null : cur));
        });
        return () => { cancelled = true; clearInterval(t); offOffer(); offCancel(); };
    }, [online, active, incoming, fetchIncoming]);


    const goOnline = async () => {
        // Client-side KYC gate — server also enforces (KYC_NOT_APPROVED).
        // If signed in, KYC MUST be 'approved'. If status not yet loaded (null),
        // fetch it now and block the tap so we never flip online before verifying.
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
                // seed initial location so incoming feed has a $near anchor
                try {
                    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                    await pushLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
                } catch { /* ignore */ }
            } catch (e) {
                const msg = e instanceof ApiError ? e.message : 'Could not go online.';
                const code = (e instanceof ApiError ? e.code : '') || '';
                if (code === 'KYC_NOT_APPROVED') {
                    // Refresh local status so the banner appears immediately.
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
            message: incoming
                ? 'You have a pending job request. Going offline will decline it.'
                : 'You will stop receiving new job requests.',
            confirmText: 'Go offline',
            cancelText: 'Stay online',
            onConfirm: async () => {
                if (isSignedIn()) { try { await setOnlineOnServer(false); } catch { /* ignore */ } }
                else { setOnline(false); }
                setIncoming(null);
            },
        });
    };

    const toggleOnline = () => (online ? goOffline() : goOnline());

    const onAccept = async () => {
        if (!incoming) return;
        if (!isSignedIn()) {
            // preview / signed-out: use local store
            useJobs.getState().acceptJob(incoming);
            setIncoming(null);
            return;
        }
        setAcceptBusy(true);
        try {
            await acceptFromServer(incoming.id);
            setIncoming(null);
        } catch (e) {
            const msg = e instanceof ApiError ? e.message : 'Could not accept the job.';
            sheet.show({ variant: 'error', title: 'Accept failed', message: msg });
        } finally {
            setAcceptBusy(false);
        }
    };

    const onDecline = async () => {
        if (incoming && isSignedIn()) {
            await declineFromServer(incoming.id, 'Rider declined');
        }
        setIncoming(null);
    };

    return (
        <View style={styles.container}>
            {/* showTraffic disabled — no fake vehicles on the rider map. Only the rider's real GPS drives the view. */}
            <LeafletMap center={center} showTraffic={false} style={StyleSheet.absoluteFill} />

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
                    <JobRequestCard job={incoming} onAccept={onAccept} onDecline={onDecline} accepting={acceptBusy} />
                ) : (
                    <View style={{ gap: 8 }}>
                        {kycStatus && kycStatus !== 'approved' && (
                            <Pressable
                                onPress={() => router.push('/documents')}
                                style={styles.kycBanner}
                            >
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
                        )}
                        <View style={styles.statusCard}>
                            <View style={styles.statusText}>
                                <Text style={styles.statusTitle}>
                                    {online ? 'You are online' : 'You are offline'}
                                </Text>
                                <Text style={styles.statusSub}>
                                    {online
                                        ? 'Waiting for a nearby job request…'
                                        : kycStatus && kycStatus !== 'approved'
                                            ? 'Verify KYC to start receiving jobs.'
                                            : 'Go online to start receiving jobs.'}
                                </Text>
                            </View>
                            <Pressable
                                style={[
                                    styles.powerBtn,
                                    online && styles.powerBtnOn,
                                    kycStatus && kycStatus !== 'approved' && !online && styles.powerBtnDisabled,
                                ]}
                                onPress={toggleOnline}
                                hitSlop={6}
                            >
                                <Power size={22} color={online ? colors.accentForeground : colors.primaryForeground} strokeWidth={2.4} />
                                <Text style={[styles.powerText, online && styles.powerTextOn]}>
                                    {online ? 'Go offline' : 'Go online'}
                                </Text>
                            </Pressable>
                        </View>
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
    powerBtnDisabled: { opacity: 0.55 },
    kycBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.danger, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10 },
    kycTitle: { fontSize: 13, fontFamily: fonts.displayBold, color: colors.foreground },
    kycSub: { fontSize: 11, fontFamily: fonts.body, color: colors.mutedForeground, marginTop: 2 },
    kycCta: { fontSize: 12, fontFamily: fonts.bodyBold, color: colors.danger, letterSpacing: 0.4, textTransform: 'uppercase' },
    powerText: { color: colors.primaryForeground, fontFamily: fonts.bodyBold, fontSize: 13, letterSpacing: 0.3 },
    powerTextOn: { color: colors.accentForeground },
    onlinePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.accent, paddingHorizontal: 10, paddingVertical: 7, borderRadius: radius.pill },
    onlineDot: { width: 7, height: 7, borderRadius: 7, backgroundColor: colors.success },
    onlinePillText: { fontSize: 11, fontFamily: fonts.bodyBold, color: colors.accentForeground, letterSpacing: 0.4, textTransform: 'uppercase' },
    onlinePillSep: { width: 1, height: 12, backgroundColor: 'rgba(0,0,0,0.15)' },
});
