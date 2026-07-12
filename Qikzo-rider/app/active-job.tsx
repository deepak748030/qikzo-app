import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { Phone, X, Navigation2, MapPin, ShieldAlert, Navigation, KeyRound, CheckCircle2, Coffee, Home as HomeIcon, PackageCheck } from 'lucide-react-native';
import { colors, fonts, radius } from '@/lib/theme';
import LeafletMap from '@/components/LeafletMap';
import StageStepper from '@/components/StageStepper';
import Button from '@/components/Button';
import BottomSheet from '@/components/BottomSheet';
import OtpVerifySheet from '@/components/OtpVerifySheet';
import { useSheet } from '@/lib/useSheet';
import { useJobs } from '@/lib/jobStore';
import { CATEGORY_META, JOB_STAGES } from '@/lib/mockData';
import { tokenStore } from '@/lib/api/tokenStore';
import { ApiError } from '@/lib/api/errors';
import { subscribe as subscribeSocket, connectSocket } from '@/lib/socket';

const FALLBACK_CENTER = { lat: 28.6139, lng: 77.2090 };

// Deterministic 4-digit pickup OTP derived from booking id — MUST match the
// exact formula used by the customer app (Qikzo-app/app/booking-details.tsx)
// so the code the rider types matches the one shown to the customer.
function pickupOtpFor(id: string): string {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return String(1000 + (h % 9000));
}

// CTAs per stage — one primary action advances the flow.
const CTA_BY_STAGE: Record<string, string> = {
    'Heading to pickup': "I've arrived",
    'Arrived at pickup': 'Verify pickup OTP',
    'Picked up': 'Mark delivered',
    'Delivered': 'Done',
};

const CANCEL_REASONS = [
    'Customer not reachable',
    'Wrong pickup address',
    'Vehicle breakdown',
    'Item unavailable at pickup',
    'Other',
];

export default function ActiveJob() {
    const insets = useSafeAreaInsets();
    const sheet = useSheet();
    const active = useJobs((s) => s.active);
    const advance = useJobs((s) => s.advanceStage);
    const cancel = useJobs((s) => s.cancelActive);
    const advanceOnServer = useJobs((s) => s.advanceOnServer);
    const cancelOnServer = useJobs((s) => s.cancelOnServer);
    const hydrateActiveFromServer = useJobs((s) => s.hydrateActiveFromServer);
    const [cancelOpen, setCancelOpen] = useState(false);
    const [otpOpen, setOtpOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [riderLoc, setRiderLoc] = useState<{ lat: number; lng: number } | null>(null);

    // Live rider location — powers the "rider → pickup" road route on the map.
    // Also periodically pushed to the server so the customer app sees us move.
    useEffect(() => {
        let mounted = true;
        let sub: Location.LocationSubscription | null = null;
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') return;
                const first = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                if (mounted) setRiderLoc({ lat: first.coords.latitude, lng: first.coords.longitude });
                sub = await Location.watchPositionAsync(
                    { accuracy: Location.Accuracy.Balanced, distanceInterval: 15, timeInterval: 5000 },
                    (loc) => {
                        if (!mounted) return;
                        setRiderLoc({ lat: loc.coords.latitude, lng: loc.coords.longitude });
                    }
                );
            } catch { /* ignore — map will just center on pickup */ }
        })();
        return () => { mounted = false; sub?.remove(); };
    }, []);

    const isSignedIn = () => !!tokenStore.get().accessToken;

    // Sync active trip on mount + realtime trip:update from server. Kept a
    // light 15s poll as a safety net if socket is disconnected.
    useEffect(() => {
        hydrateActiveFromServer();
        connectSocket();
        const off = subscribeSocket('trip:update', () => {
            if (isSignedIn()) hydrateActiveFromServer();
        });
        // Customer cancelled the booking → server emits both job:cancelled
        // (to all online riders) and booking:update (Cancelled). Whichever
        // arrives first, wipe the active job and inform this rider.
        const handleCustomerCancel = (bookingId: string) => {
            const a = useJobs.getState().active;
            if (!a) return;
            if (a.bookingId && String(a.bookingId) !== String(bookingId)) return;
            useJobs.setState({ active: null });
            sheet.show({
                variant: 'warning',
                title: 'Customer cancelled',
                message: 'The customer cancelled this booking. You are back online for new jobs.',
                confirmText: 'OK',
                onConfirm: () => { sheet.hide(); router.replace('/(tabs)'); },
            });
        };
        const offJobCancel = subscribeSocket('job:cancelled', (p: any) => {
            if (p?.id) handleCustomerCancel(String(p.id));
        });
        const offBookingUpdate = subscribeSocket('booking:update', (p: any) => {
            if (p?.status === 'Cancelled' && p?.id) handleCustomerCancel(String(p.id));
        });
        const t = setInterval(() => {
            if (isSignedIn()) hydrateActiveFromServer();
        }, 15000);
        return () => { off(); offJobCancel(); offBookingUpdate(); clearInterval(t); };
    }, [hydrateActiveFromServer]);

    // Delivered → auto-finalize the trip on the server and send the rider
    // straight back to the home dashboard. Declared BEFORE the early return
    // below so the hook order stays stable across renders.
    const activeIsFinal = !!active && active.stage === JOB_STAGES[JOB_STAGES.length - 1];
    useEffect(() => {
        if (!activeIsFinal || !active) return;
        let cancelled = false;
        (async () => {
            try {
                if (active.tripId && !!tokenStore.get().accessToken) {
                    await advanceOnServer();
                } else {
                    advance();
                }
            } catch {}
            if (cancelled) return;
            sheet.show({
                variant: 'success',
                title: 'Delivered',
                message: `Trip #${active.id} complete. Nice work!`,
                confirmText: 'OK',
                onConfirm: () => { sheet.hide(); router.replace('/(tabs)'); },
            });
            setTimeout(() => { if (!cancelled) router.replace('/(tabs)'); }, 1800);
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeIsFinal]);



    if (!active) {
        return (
            <View style={[styles.empty, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
                <View style={styles.emptyIconWrap}>
                    <PackageCheck size={44} color={colors.primary} strokeWidth={1.8} />
                </View>
                <Text style={styles.emptyTitle}>All caught up</Text>
                <Text style={styles.emptyText}>You don't have an active job right now. Head back to the dashboard and go online to start receiving new requests.</Text>
                <View style={styles.emptyActions}>
                    <Button label="Back to dashboard" onPress={() => router.replace('/(tabs)')} />
                    <Pressable style={styles.emptyGhost} onPress={() => router.push('/(tabs)/activity')}>
                        <Text style={styles.emptyGhostText}>View recent trips</Text>
                    </Pressable>
                </View>
            </View>
        );
    }

    const cat = CATEGORY_META[active.category];
    const isFinal = active.stage === JOB_STAGES[JOB_STAGES.length - 1];

    // Prefer the server-driven advance whenever this trip has a tripId (i.e.
    // it was accepted online). Falls back to local advance in preview.
    const runAdvance = async () => {
        setBusy(true);
        try {
            if (active.tripId && isSignedIn()) await advanceOnServer();
            else advance();
        } catch (e) {
            const msg = e instanceof ApiError ? e.message : 'Could not update trip.';
            sheet.show({ variant: 'error', title: 'Update failed', message: msg });
        } finally {
            setBusy(false);
        }
    };

    const onCta = async () => {
        if (active.stage === 'Arrived at pickup') { setOtpOpen(true); return; }
        if (isFinal) { await runAdvance(); router.replace('/(tabs)'); return; }
        await runAdvance();
    };

    const onOtpVerified = async () => {
        setOtpOpen(false);
        await runAdvance();
        sheet.show({
            variant: 'success',
            title: 'Pickup verified',
            message: 'OTP matched. Trip started — drive safe.',
        });
    };

    const chooseReason = async (reason: string) => {
        setCancelOpen(false);
        setBusy(true);
        try {
            if (active.tripId && isSignedIn()) await cancelOnServer(reason);
            else cancel(reason);
            router.replace('/(tabs)');
        } catch (e) {
            const msg = e instanceof ApiError ? e.message : 'Could not cancel trip.';
            sheet.show({ variant: 'error', title: 'Cancel failed', message: msg });
        } finally {
            setBusy(false);
        }
    };

    if (isFinal) {
        return <View style={[styles.container, { backgroundColor: colors.background }]} />;
    }





    // Real trip geometry — customer's pickup, drop, and the rider's live GPS
    // position. Falls back to the map's default center only if none are known
    // yet (fresh mount, permissions denied). NEVER renders random vehicles.
    const pickupCoord = active.pickupCoord ?? null;
    const dropCoord = active.dropCoord ?? null;
    const mapCenter = riderLoc ?? pickupCoord ?? dropCoord ?? FALLBACK_CENTER;

    return (
        <View style={styles.container}>
            <LeafletMap
                center={mapCenter}
                pickup={pickupCoord}
                drop={dropCoord}
                riderLocation={riderLoc}
                showTraffic={false}
                style={StyleSheet.absoluteFill}
            />


            {/* Top status bar */}
            <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
                <Pressable style={styles.iconBtn} onPress={() => router.replace('/(tabs)')} hitSlop={6}>
                    <X size={20} color={colors.foreground} />
                </Pressable>
                <View style={styles.topLabel}>
                    <Text style={styles.topEmoji}>{cat.emoji}</Text>
                    <Text style={styles.topText}>{cat.label} · #{active.id}</Text>
                </View>
                <Pressable
                    style={styles.sosBtn}
                    onPress={() => sheet.show({
                        variant: 'warning',
                        title: 'Call SOS?',
                        message: 'This will alert Qikzo safety and share your live location with local authorities.',
                        confirmText: 'Call SOS',
                        cancelText: 'Cancel',
                        onConfirm: () => sheet.show({ variant: 'success', title: 'Help is on the way', message: 'Our safety team has been notified. Stay where you are.' }),
                    })}
                    hitSlop={6}
                >
                    <ShieldAlert size={16} color={colors.card} strokeWidth={2.4} />
                    <Text style={styles.sosText}>SOS</Text>
                </Pressable>
            </View>

            {/* Bottom sheet */}
            <ScrollView
                style={styles.sheet}
                contentContainerStyle={[styles.sheetContent, { paddingBottom: insets.bottom + 12 }]}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.handle} />

                <StageStepper stage={active.stage} />

                <View style={styles.customerRow}>
                    <View style={styles.customerAvatar}>
                        <Text style={styles.customerInitial}>{active.customerName.charAt(0)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.customerName}>{active.customerName}</Text>
                        <Text style={styles.customerPhone}>{active.customerPhone}</Text>
                    </View>
                    <Pressable
                        style={styles.callBtn}
                        onPress={() => sheet.show({ variant: 'info', title: 'Calling…', message: `Dialing ${active.customerName}.` })}
                    >
                        <Phone size={18} color={colors.primaryForeground} />
                    </Pressable>
                </View>

                <View style={styles.stops}>
                    <StopRow icon="pickup" label="Pickup" value={active.pickup} onNavigate={() => sheet.show({ variant: 'info', title: 'Opening navigation', message: 'Turn-by-turn directions will open in your default maps app.' })} />
                    <View style={styles.stopDash} />
                    <StopRow icon="drop" label="Drop" value={active.drop} onNavigate={() => sheet.show({ variant: 'info', title: 'Opening navigation', message: 'Turn-by-turn directions will open in your default maps app.' })} />
                </View>

                {active.notes ? (
                    <View style={styles.notes}>
                        <Text style={styles.notesLabel}>Customer note</Text>
                        <Text style={styles.notesText}>{active.notes}</Text>
                    </View>
                ) : null}

                <View style={styles.fareRow}>
                    <View>
                        <Text style={styles.fareLabel}>You will earn</Text>
                        <Text style={styles.fareValue}>₹{active.fare}</Text>
                    </View>
                    <View style={styles.fareMeta}>
                        <Text style={styles.fareMetaText}>{active.distanceKm.toFixed(1)} km · {active.etaMin} min</Text>
                        <Text style={styles.fareMetaText}>Payment: {active.payment.toUpperCase()}</Text>
                    </View>
                </View>

                {active.stage === 'Arrived at pickup' ? (
                    <View style={styles.otpBanner}>
                        <View style={styles.otpBannerIcon}>
                            <KeyRound size={16} color={colors.primary} strokeWidth={2.2} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.otpBannerTitle}>Verify pickup with OTP</Text>
                            <Text style={styles.otpBannerText}>Ask {active.customerName.split(' ')[0]} for the 4-digit code in their Qikzo app before starting the trip.</Text>
                        </View>
                    </View>
                ) : null}

                <Button label={CTA_BY_STAGE[active.stage]} loading={busy} onPress={onCta} style={{ marginTop: 12 }} />

                <Pressable style={styles.cancelBtn} onPress={() => setCancelOpen(true)}>
                    <Text style={styles.cancelText}>Cancel job</Text>
                </Pressable>
            </ScrollView>

            <BottomSheet visible={sheet.visible} {...sheet.config} onClose={sheet.hide} />

            <OtpVerifySheet
                visible={otpOpen}
                expected={pickupOtpFor(active.bookingId || active.id)}
                customerName={active.customerName}
                onClose={() => setOtpOpen(false)}
                onVerified={onOtpVerified}
            />

            {/* Cancel reasons sheet */}
            {cancelOpen ? (
                <View style={styles.reasonsOverlay}>
                    <Pressable style={styles.reasonsBackdrop} onPress={() => setCancelOpen(false)} />
                    <View style={[styles.reasonsSheet, { paddingBottom: insets.bottom + 12 }]}>
                        <View style={styles.handle} />
                        <Text style={styles.reasonsTitle}>Why are you cancelling?</Text>
                        {CANCEL_REASONS.map((r) => (
                            <Pressable key={r} style={styles.reasonRow} onPress={() => chooseReason(r)}>
                                <Text style={styles.reasonText}>{r}</Text>
                            </Pressable>
                        ))}
                    </View>
                </View>
            ) : null}
        </View>
    );
}

function StopRow({ icon, label, value, onNavigate }: { icon: 'pickup' | 'drop'; label: string; value: string; onNavigate?: () => void }) {
    const Icon = icon === 'pickup' ? MapPin : Navigation2;
    const tint = icon === 'pickup' ? colors.accent : colors.primary;
    return (
        <View style={styles.stopRow}>
            <View style={[styles.stopDot, { borderColor: tint }]}>
                <Icon size={12} color={tint} strokeWidth={2.4} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.stopLabel}>{label}</Text>
                <Text style={styles.stopValue} numberOfLines={1}>{value}</Text>
            </View>
            {onNavigate ? (
                <Pressable style={styles.navBtn} onPress={onNavigate} hitSlop={6}>
                    <Navigation size={14} color={colors.primary} strokeWidth={2.2} />
                    <Text style={styles.navText}>Navigate</Text>
                </Pressable>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 14, backgroundColor: colors.background },
    emptyIconWrap: { width: 96, height: 96, borderRadius: radius.pill, backgroundColor: colors.chipBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
    emptyTitle: { fontSize: 22, fontFamily: fonts.displayBold, color: colors.foreground, letterSpacing: -0.4, marginTop: 4 },
    emptyText: { fontSize: 13, fontFamily: fonts.body, color: colors.mutedForeground, textAlign: 'center', lineHeight: 19, paddingHorizontal: 12 },
    emptyActions: { width: '100%', marginTop: 10, gap: 10 },
    emptyGhost: { alignSelf: 'center', paddingVertical: 10 },
    emptyGhostText: { fontSize: 13, fontFamily: fonts.bodyBold, color: colors.primary, textDecorationLine: 'underline' },
    summary: { paddingHorizontal: 6, alignItems: 'stretch' },
    summaryBadge: { alignSelf: 'center', width: 88, height: 88, borderRadius: radius.pill, backgroundColor: colors.chipBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
    summaryEyebrow: { textAlign: 'center', marginTop: 14, fontSize: 11, fontFamily: fonts.bodyBold, color: colors.primary, letterSpacing: 1, textTransform: 'uppercase' },
    summaryTitle: { textAlign: 'center', marginTop: 6, fontSize: 24, fontFamily: fonts.displayBold, color: colors.foreground, letterSpacing: -0.5 },
    summarySub: { textAlign: 'center', marginTop: 6, fontSize: 13, fontFamily: fonts.body, color: colors.mutedForeground, lineHeight: 19, paddingHorizontal: 18 },
    earnCard: { marginTop: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 16 },
    earnLabel: { fontSize: 11, fontFamily: fonts.bodyBold, color: colors.mutedForeground, letterSpacing: 0.6, textTransform: 'uppercase' },
    earnValue: { fontSize: 36, fontFamily: fonts.displayBold, color: colors.foreground, marginTop: 4, letterSpacing: -1 },
    earnRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
    earnRowKey: { fontSize: 13, fontFamily: fonts.body, color: colors.mutedForeground },
    earnRowVal: { fontSize: 13, fontFamily: fonts.bodyBold, color: colors.foreground },
    earnRowKeyBold: { fontSize: 13, fontFamily: fonts.bodyBold, color: colors.foreground },
    earnRowValBold: { fontSize: 13, fontFamily: fonts.bodyBold, color: colors.primary },
    earnDivider: { height: 1, backgroundColor: colors.divider, marginTop: 12 },
    cashBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, padding: 10, borderRadius: radius.sm, backgroundColor: '#FBF3E1', borderWidth: 1, borderColor: colors.warning },
    cashBannerText: { flex: 1, fontSize: 12, fontFamily: fonts.body, color: colors.foreground, lineHeight: 16 },
    chipsRow: { flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' },
    chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.chipBg, borderWidth: 1, borderColor: colors.border },
    chipText: { fontSize: 12, fontFamily: fonts.bodyBold, color: colors.foreground },
    sectionTitle: { fontSize: 13, fontFamily: fonts.displayBold, color: colors.foreground, marginTop: 22, marginBottom: 10 },
    tipRow: { flexDirection: 'row', gap: 8 },
    tipBtn: { flex: 1, height: 42, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
    tipBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    tipBtnText: { fontSize: 13, fontFamily: fonts.bodyBold, color: colors.foreground },
    tipBtnTextActive: { color: colors.primaryForeground },
    starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 4 },
    starsHint: { textAlign: 'center', marginTop: 8, fontSize: 12, fontFamily: fonts.body, color: colors.mutedForeground },
    summaryGhost: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, paddingVertical: 12 },
    summaryGhostText: { fontSize: 13, fontFamily: fonts.bodyBold, color: colors.mutedForeground },
    top: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 6, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(240,237,229,0.95)', borderBottomWidth: 1, borderBottomColor: colors.border },
    iconBtn: { width: 36, height: 36, borderRadius: radius.pill, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    topLabel: { flexDirection: 'row', gap: 6, alignItems: 'center' },
    topEmoji: { fontSize: 16 },
    topText: { fontSize: 13, fontFamily: fonts.bodyBold, color: colors.foreground },
    sosBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 36, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: colors.danger },
    sosText: { fontSize: 12, fontFamily: fonts.bodyBold, color: colors.card, letterSpacing: 0.5 },
    navBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.card },
    navText: { fontSize: 11, fontFamily: fonts.bodyBold, color: colors.primary, letterSpacing: 0.3 },
    sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '68%', backgroundColor: colors.card, borderTopWidth: 1, borderColor: colors.border, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
    sheetContent: { paddingHorizontal: 12, paddingTop: 8 },
    handle: { alignSelf: 'center', width: 40, height: 4, backgroundColor: colors.border, borderRadius: radius.pill, marginBottom: 12 },
    customerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.divider },
    customerAvatar: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.chipBg, alignItems: 'center', justifyContent: 'center' },
    customerInitial: { fontSize: 15, fontFamily: fonts.displayBold, color: colors.primary },
    customerName: { fontSize: 14, fontFamily: fonts.bodyBold, color: colors.foreground },
    customerPhone: { fontSize: 12, fontFamily: fonts.body, color: colors.mutedForeground, marginTop: 2 },
    callBtn: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    stops: { paddingTop: 12, gap: 6 },
    stopRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    stopDot: { width: 22, height: 22, borderRadius: radius.pill, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
    stopLabel: { fontSize: 10, fontFamily: fonts.bodyBold, color: colors.mutedForeground, letterSpacing: 0.5, textTransform: 'uppercase' },
    stopValue: { fontSize: 13, fontFamily: fonts.body, color: colors.foreground },
    stopDash: { height: 10, width: 1, backgroundColor: colors.border, marginLeft: 11 },
    notes: { marginTop: 12, backgroundColor: colors.chipBg, padding: 10, borderRadius: radius.sm },
    notesLabel: { fontSize: 10, fontFamily: fonts.bodyBold, color: colors.mutedForeground, letterSpacing: 0.5, textTransform: 'uppercase' },
    notesText: { fontSize: 12, fontFamily: fonts.body, color: colors.foreground, marginTop: 3 },
    fareRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 14 },
    fareLabel: { fontSize: 11, fontFamily: fonts.bodyBold, color: colors.mutedForeground, letterSpacing: 0.5, textTransform: 'uppercase' },
    fareValue: { fontSize: 26, fontFamily: fonts.displayBold, color: colors.foreground, marginTop: 3, letterSpacing: -0.5 },
    fareMeta: { alignItems: 'flex-end', gap: 3 },
    fareMetaText: { fontSize: 11, fontFamily: fonts.body, color: colors.mutedForeground },
    cancelBtn: { alignSelf: 'center', paddingVertical: 12 },
    cancelText: { fontSize: 13, fontFamily: fonts.bodyBold, color: colors.danger, textDecorationLine: 'underline' },
    reasonsOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
    reasonsBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    reasonsSheet: { backgroundColor: colors.card, paddingHorizontal: 12, paddingTop: 10, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
    reasonsTitle: { fontSize: 15, fontFamily: fonts.displayBold, color: colors.foreground, marginBottom: 6 },
    reasonRow: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.divider },
    reasonText: { fontSize: 14, fontFamily: fonts.body, color: colors.foreground },
    otpBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, padding: 12, borderRadius: radius.md, backgroundColor: colors.chipBg, borderWidth: 1, borderColor: colors.primary },
    otpBannerIcon: { width: 30, height: 30, borderRadius: radius.pill, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
    otpBannerTitle: { fontSize: 12, fontFamily: fonts.bodyBold, color: colors.foreground, letterSpacing: 0.2 },
    otpBannerText: { fontSize: 11, fontFamily: fonts.body, color: colors.mutedForeground, marginTop: 2, lineHeight: 15 },
});
