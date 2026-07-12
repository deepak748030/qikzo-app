import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { PhoneCall, X, NotebookPen, Bike, Star, BadgeCheck, MapPinned, Flag, Radar, KeyRound, ShieldCheck, Gift, Send, Phone, MapPin, Navigation2, Navigation, ShieldAlert } from 'lucide-react-native';
import AnimatedIcon from '@/components/AnimatedIcon';
import { colors, fonts, radius } from '@/lib/theme';
import ScreenHeader from '@/components/ScreenHeader';
import Button from '@/components/Button';
import BottomSheet from '@/components/BottomSheet';
import { useSheet } from '@/lib/useSheet';
import { useBooking } from '@/lib/bookingStore';
import { BookingStatus, categories } from '@/lib/mockData';
import { useAuth } from '@/lib/authStore';
import { tokenStore } from '@/lib/api/tokenStore';
import { subscribe as subscribeSocket, emit as socketEmit, connectSocket } from '@/lib/socket';
import BookingStageOverlay, { Stage, VehicleKind } from '@/components/BookingStageOverlay';
import LeafletMap from '@/components/LeafletMap';
import { ratingsApi } from '@/lib/api/endpoints/ratings';
import RateRiderModal from '@/components/RateRiderModal';
import BookingStageStepper from '@/components/BookingStageStepper';

// Map booking category → vehicle rendered on the "accepted" overlay.
// Ride categories map 1:1; delivery categories default to the delivery bike.
function vehicleFor(categoryId?: string): VehicleKind {
    if (categoryId === 'cab') return 'car';
    if (categoryId === 'auto') return 'auto';
    return 'bike';
}

// Deterministic 4-digit pickup OTP derived from booking id so the same
// code shows up on every render of the same trip.
function pickupOtpFor(id: string): string {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return String(1000 + (h % 9000));
}



// Linear simulation of a real trip lifecycle.
const FLOW: BookingStatus[] = [
    'Searching rider',
    'Rider accepted',
    'Arriving for pickup',
    'Picked up',
    'On the way',
    'Delivered',
];

const STEP_DELAY_MS = 3500;

export default function BookingDetailsScreen() {
    const insets = useSafeAreaInsets();
    const { id } = useLocalSearchParams<{ id: string }>();
    const booking = useBooking((s) => s.bookings.find((b) => b.id === id));
    const updateStatus = useBooking((s) => s.updateStatus);
    const assignRider = useBooking((s) => s.assignRider);
    const refreshOne = useBooking((s) => s.refreshOne);
    const cancelOnServer = useBooking((s) => s.cancelOnServer);
    const sheet = useSheet();
    const [cancelling, setCancelling] = useState(false);
    const userName = useAuth((s) => s.name);
    const [deliveredDismissed, setDeliveredDismissed] = useState(false);
    const [acceptedDismissed, setAcceptedDismissed] = useState(false);
    const [riderLoc, setRiderLoc] = useState<{ lat: number; lng: number } | null>(null);

    // Rating — modal-driven. We only track the existing rating (if any) and
    // whether the modal is open. All input state lives inside the modal.
    const [existingRating, setExistingRating] = useState<any | null>(null);
    const [rateModalOpen, setRateModalOpen] = useState(false);
    const [autoOpenedRate, setAutoOpenedRate] = useState(false);

    // Fetch any existing rating once delivered, so we don't let the user
    // rate the same booking twice.
    const serverBookingId = (booking as any)?.serverId as string | undefined;
    useEffect(() => {
        if (!serverBookingId) return;
        if (booking?.status !== 'Delivered') return;
        if (!tokenStore.get().accessToken) return;
        let cancelled = false;
        ratingsApi.getForBooking(serverBookingId)
            .then((res) => { if (!cancelled) setExistingRating(res?.rating || null); })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [serverBookingId, booking?.status]);

    // Auto-open the rate modal once, when the trip flips to Delivered and no
    // rating exists yet. User can Skip; we don't re-open automatically.
    useEffect(() => {
        if (booking?.status !== 'Delivered') return;
        if (autoOpenedRate) return;
        if (existingRating) return;
        if (!booking?.rider) return;
        setRateModalOpen(true);
        setAutoOpenedRate(true);
    }, [booking?.status, booking?.rider, existingRating, autoOpenedRate]);

    // Reset the dismissed latch if the booking cycles back to searching
    // (e.g. rider cancelled, we're re-dispatching).
    useEffect(() => {
        if (booking?.status === 'Searching rider') setAcceptedDismissed(false);
    }, [booking?.status]);

    // Subscribe to the assigned rider's live location for the map preview.
    // Two channels: `location:update` is trip-scoped and fires on every rider
    // location write while a trip is active (authoritative). `rider:location`
    // is the general nearby-riders broadcast — kept as a fallback so the map
    // still moves before the trip room join completes.
    // In addition we SEED the marker from `GET /riders/:id` on mount and poll
    // every 10s. This ensures a stationary rider (no location:update events
    // being emitted) still shows up on the map right after the trip is accepted.
    const riderId = booking?.rider?.id;
    const serverBookingIdForLoc = (booking as any)?.serverId as string | undefined;
    useEffect(() => {
        if (!riderId) { setRiderLoc(null); return; }
        try { connectSocket(); } catch {}
        let cancelled = false;

        const seedFromServer = async () => {
            try {
                const { ridersApi } = await import('@/lib/api/endpoints/riders');
                const rider: any = await ridersApi.getPublic(String(riderId));
                if (cancelled) return;
                const coords = rider?.currentLocation?.coordinates;
                if (Array.isArray(coords) && coords.length === 2) {
                    const [lng, lat] = coords;
                    if (Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) {
                        setRiderLoc({ lat: Number(lat), lng: Number(lng) });
                    }
                }
            } catch { /* silent — socket updates will still drive the map */ }
        };
        seedFromServer();
        const seedPoll = setInterval(seedFromServer, 10000);

        const offTripLoc = subscribeSocket('location:update', (p: any) => {
            if (!p || typeof p.lat !== 'number' || typeof p.lng !== 'number') return;
            if (serverBookingIdForLoc && String(p.bookingId) !== String(serverBookingIdForLoc)) return;
            setRiderLoc({ lat: p.lat, lng: p.lng });
        });
        const offNearby = subscribeSocket('rider:location', (p: any) => {
            if (!p || String(p.id) !== String(riderId)) return;
            if (typeof p.lat !== 'number' || typeof p.lng !== 'number') return;
            setRiderLoc({ lat: p.lat, lng: p.lng });
        });
        return () => { cancelled = true; clearInterval(seedPoll); offTripLoc(); offNearby(); };
    }, [riderId, serverBookingIdForLoc]);

    // Real-time booking/trip updates via socket + a 10s poll safety net.
    useEffect(() => {
        if (!id || !tokenStore.get().accessToken) return;
        if (!booking || booking.status === 'Delivered' || booking.status === 'Cancelled') return;
        const serverId = (booking as any).serverId as string | undefined;
        connectSocket();
        if (serverId) socketEmit('booking:subscribe', serverId);
        const offBooking = subscribeSocket('booking:update', (p: any) => {
            if (!serverId || String(p?.id) === String(serverId)) refreshOne(String(id));
        });
        const offTrip = subscribeSocket('trip:update', (p: any) => {
            if (!serverId || String(p?.booking) === String(serverId)) refreshOne(String(id));
        });
        const poll = setInterval(() => { refreshOne(String(id)); }, 10000);
        return () => {
            offBooking(); offTrip(); clearInterval(poll);
            if (serverId) socketEmit('booking:unsubscribe', serverId);
        };
    }, [id, booking?.status, refreshOne]);


    // Auto-progression timer (simulated rider matching + trip). Only runs when
    // the user is signed OUT — otherwise the server is the source of truth and
    // the poll above drives status transitions.
    useEffect(() => {
        if (tokenStore.get().accessToken) return;
        if (!booking) return;
        if (booking.status === 'Delivered' || booking.status === 'Cancelled') return;
        const idx = FLOW.indexOf(booking.status);
        if (idx < 0 || idx >= FLOW.length - 1) return;

        const timer = setTimeout(() => {
            const nextStatus = FLOW[idx + 1];
            if (nextStatus === 'Rider accepted' && !booking.rider) {
                assignRider(booking.id);
            } else {
                updateStatus(booking.id, nextStatus);
            }
        }, STEP_DELAY_MS);

        return () => clearTimeout(timer);
    }, [booking?.status, booking?.id]);


    // Pulse animation while searching for a rider.
    const pulse = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        if (booking?.status === 'Searching rider') {
            const loop = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
                    Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: true }),
                ])
            );
            loop.start();
            return () => loop.stop();
        }
    }, [booking?.status]);

    if (!booking) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="Booking" />
                <View style={{ padding: 12 }}>
                    <Text style={styles.missing}>This booking could not be found.</Text>
                </View>
            </View>
        );
    }

    const category = categories.find((c) => c.id === booking.categoryId);
    const isActive = booking.status !== 'Delivered' && booking.status !== 'Cancelled';
    const currentIdx = FLOW.indexOf(booking.status);

    // Which full-screen immersive stage (if any) should render on top of the details.
    // Overlay policy:
    //  • Searching  → 'searching' until a rider is assigned.
    //  • Rider accepted → 'accepted' ONCE, then auto-dismiss reveals the
    //    full rider info / trip page underneath (fix for overlay getting
    //    stuck on "guest is on the way").
    //  • Delivered  → 'delivered' celebration until user dismisses.
    // Once the rider taps "I've arrived" (status → Arriving for pickup) or
    // any later stage, drop every full-screen overlay so the pickup OTP card
    // on the details screen becomes visible immediately.
    const postArrivalStatuses = ['Arriving for pickup', 'Picked up', 'On the way', 'Delivered', 'Cancelled'];
    const overlayStage: Stage | null =
        postArrivalStatuses.includes(booking.status) && booking.status !== 'Delivered'
            ? null
            : booking.status === 'Searching rider'
                ? 'searching'
                : booking.status === 'Rider accepted' && !acceptedDismissed
                    ? 'accepted'
                    : booking.status === 'Delivered' && !deliveredDismissed
                        ? 'delivered'
                        : null;

    const onOverlayCancel = async () => {
        setCancelling(true);
        try {
            await cancelOnServer(booking.id, 'User cancelled from overlay');
            sheet.show({
                variant: 'success',
                title: 'Booking cancelled',
                message: 'Your booking was cancelled. The rider has been notified.',
                confirmText: 'OK',
                onConfirm: () => sheet.hide(),
            });
        } finally { setCancelling(false); }
    };

    const onCancel = () => {
        sheet.show({
            variant: 'warning',
            title: 'Cancel this booking?',
            message: 'The rider will be notified. Repeated cancellations may affect your account.',
            confirmText: 'Yes, cancel',
            cancelText: 'Keep booking',
            onConfirm: async () => {
                setCancelling(true);
                try {
                    await cancelOnServer(booking.id, 'User cancelled');
                    sheet.hide();
                    setTimeout(() => {
                        sheet.show({
                            variant: 'success',
                            title: 'Booking cancelled',
                            message: 'Your booking was cancelled. The rider has been notified in real time.',
                            confirmText: 'OK',
                            onConfirm: () => sheet.hide(),
                        });
                    }, 200);
                }
                finally {
                    setCancelling(false);
                }
            },
        });
    };


    const onCallRider = () => {
        if (!booking.rider) return;
        sheet.show({
            variant: 'info',
            title: `Call ${booking.rider.name}?`,
            message: `Connecting you to your rider on a masked number to protect privacy.`,
            confirmText: 'Call now',
            cancelText: 'Cancel',
        });
    };

    const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] });
    const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

    const pickupCoord = booking.pickupCoord || null;
    const dropCoord = booking.dropCoord || null;
    const mapCenter = riderLoc || pickupCoord || dropCoord || { lat: 28.6139, lng: 77.2090 };
    const showMap = !!pickupCoord && booking.status !== 'Cancelled';
    const catEmoji = category?.emoji || '📦';
    const catName = category?.name || 'Delivery';

    return (
        <View style={styles.container}>
            {/* Full-screen live map underneath — matches rider active-job */}
            {showMap ? (
                <LeafletMap
                    center={mapCenter}
                    pickup={pickupCoord}
                    drop={dropCoord}
                    riderLocation={riderLoc && riderId ? { lat: riderLoc.lat, lng: riderLoc.lng } : null}
                    showTraffic={false}
                    style={StyleSheet.absoluteFill}
                />
            ) : (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
            )}

            {/* Top status bar */}
            <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
                <Pressable style={styles.iconBtn} onPress={() => router.replace('/(tabs)')} hitSlop={6}>
                    <X size={20} color={colors.foreground} />
                </Pressable>
                <View style={styles.topLabel}>
                    <Text style={styles.topEmoji}>{catEmoji}</Text>
                    <Text style={styles.topText}>{catName} · #{booking.id}</Text>
                </View>
                <Pressable
                    style={styles.sosBtn}
                    onPress={() => sheet.show({
                        variant: 'warning',
                        title: 'Call SOS?',
                        message: 'This will alert Qikzo safety and share your live trip with local authorities.',
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

                {booking.status !== 'Cancelled' ? (
                    <BookingStageStepper status={booking.status} />
                ) : (
                    <View style={styles.cancelledBanner}>
                        <X size={16} color={colors.danger} />
                        <Text style={styles.cancelledText}>This booking was cancelled.</Text>
                    </View>
                )}

                {/* Rider row — mirrors rider app's customer row */}
                {booking.rider && booking.status !== 'Cancelled' ? (
                    <View style={styles.riderRow}>
                        <View style={styles.riderAvatar}>
                            <Text style={styles.riderInitial}>{booking.rider.name.charAt(0)}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.riderName}>{booking.rider.name}</Text>
                            <View style={styles.riderMetaRow}>
                                <Star size={11} color={colors.accent} fill={colors.accent} />
                                <Text style={styles.riderMeta}>
                                    {booking.rider.rating} · {booking.rider.vehicle} · {booking.rider.vehicleNo}
                                </Text>
                            </View>
                        </View>
                        <Pressable style={styles.callBtn} onPress={onCallRider}>
                            <Phone size={18} color={colors.primaryForeground} />
                        </Pressable>
                    </View>
                ) : booking.status === 'Searching rider' ? (
                    <View style={styles.searchingRow}>
                        <View style={styles.searchingIcon}>
                            <AnimatedIcon Icon={Radar} size={22} color={colors.foreground} variant="spin" strokeWidth={1.8} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.riderName}>Finding your rider…</Text>
                            <Text style={styles.riderMeta}>Matching the nearest captain to your pickup.</Text>
                        </View>
                    </View>
                ) : null}

                {/* Stops — pickup / drop */}
                <View style={styles.stops}>
                    <StopRow icon="pickup" label="Pickup" value={booking.pickup} />
                    <View style={styles.stopDash} />
                    <StopRow icon="drop" label="Drop" value={booking.drop} />
                </View>

                {/* Notes */}
                {booking.notes ? (
                    <View style={styles.notes}>
                        <Text style={styles.notesLabel}>Note for rider</Text>
                        <Text style={styles.notesText}>{booking.notes}</Text>
                        {booking.recipientPhone ? (
                            <Text style={styles.recipient}>Recipient: +91 {booking.recipientPhone}</Text>
                        ) : null}
                    </View>
                ) : null}

                {/* Fare summary */}
                <View style={styles.fareRow}>
                    <View>
                        <Text style={styles.fareLabel}>You pay</Text>
                        <Text style={styles.fareValue}>₹{booking.price}</Text>
                    </View>
                    <View style={styles.fareMeta}>
                        <Text style={styles.fareMetaText}>{booking.distanceKm.toFixed(1)} km · ~{booking.etaMin} min</Text>
                        <Text style={styles.fareMetaText}>Payment: {booking.payment.toUpperCase()}</Text>
                    </View>
                </View>

                {/* Pickup OTP banner — appears when rider arrives */}
                {booking.status === 'Arriving for pickup' ? (
                    <View style={styles.otpBanner}>
                        <View style={styles.otpBannerHead}>
                            <View style={styles.otpBannerIcon}>
                                <ShieldCheck size={16} color={colors.primary} strokeWidth={2.2} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.otpBannerTitle}>Share this pickup OTP</Text>
                                <Text style={styles.otpBannerText}>
                                    Read this code to {booking.rider?.name?.split(' ')[0] || 'your rider'} so they can start the trip.
                                </Text>
                            </View>
                        </View>
                        <View style={styles.otpDigitsRow}>
                            {pickupOtpFor(serverBookingId || booking.id).split('').map((d, i) => (
                                <View key={i} style={styles.otpDigitBox}>
                                    <Text style={styles.otpDigitText}>{d}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                ) : null}

                {/* Rating opener / summary — post-delivery */}
                {booking.status === 'Delivered' && booking.rider ? (
                    existingRating ? (
                        <View style={styles.ratedCard}>
                            <BadgeCheck size={16} color={colors.success} />
                            <Text style={styles.ratedText}>
                                You rated {booking.rider.name.split(' ')[0]} {existingRating.stars}★
                                {existingRating.tip > 0 ? ` · ₹${existingRating.tip} tip sent` : ''}
                            </Text>
                        </View>
                    ) : (
                        <Pressable style={styles.rateOpener} onPress={() => setRateModalOpen(true)}>
                            <Star size={16} color={colors.accent} fill={colors.accent} />
                            <Text style={styles.rateOpenerText}>
                                Rate {booking.rider.name.split(' ')[0]} & add a tip
                            </Text>
                        </Pressable>
                    )
                ) : null}

                {/* Primary CTA — cancel while active, book another after finished */}
                {isActive ? (
                    <Button
                        label="Cancel booking"
                        variant="outline"
                        loading={cancelling}
                        onPress={onCancel}
                        style={{ marginTop: 14 }}
                    />
                ) : (
                    <Button
                        label="Book another"
                        onPress={() => router.replace('/book-delivery')}
                        style={{ marginTop: 14 }}
                    />
                )}
            </ScrollView>

            <BottomSheet visible={sheet.visible} {...sheet.config} onClose={sheet.hide} />

            <RateRiderModal
                visible={rateModalOpen}
                onClose={() => setRateModalOpen(false)}
                riderName={booking.rider?.name || 'your rider'}
                serverBookingId={serverBookingId}
                onSubmitted={(r) => setExistingRating(r)}
            />

            {/* Full-screen immersive stage overlays */}
            <BookingStageOverlay
                visible={overlayStage === 'searching'}
                stage="searching"
                onCancel={onOverlayCancel}
                cancelling={cancelling}
            />
            <BookingStageOverlay
                visible={overlayStage === 'accepted'}
                stage="accepted"
                vehicle={vehicleFor(booking.categoryId)}
                riderName={booking.rider?.name}
                autoDismissMs={3600}
                onContinue={() => setAcceptedDismissed(true)}
            />
            <BookingStageOverlay
                visible={overlayStage === 'delivered'}
                stage="delivered"
                userName={userName}
                bookingId={booking.id}
                onDismiss={() => setDeliveredDismissed(true)}
            />
        </View>
    );
}

function StopRow({ icon, label, value }: { icon: 'pickup' | 'drop'; label: string; value: string }) {
    const Icon = icon === 'pickup' ? MapPin : Navigation2;
    const tint = icon === 'pickup' ? colors.accent : colors.primary;
    return (
        <View style={styles.stopRow}>
            <View style={[styles.stopDot, { borderColor: tint }]}>
                <Icon size={12} color={tint} strokeWidth={2.4} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.stopLabel}>{label}</Text>
                <Text style={styles.stopValue} numberOfLines={2}>{value}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    missing: { fontSize: 14, color: colors.mutedForeground, fontFamily: fonts.body },

    top: {
        position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 6, paddingBottom: 10,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: 'rgba(240,237,229,0.95)', borderBottomWidth: 1, borderBottomColor: colors.border,
        zIndex: 10,
    },
    iconBtn: { width: 36, height: 36, borderRadius: radius.pill, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    topLabel: { flexDirection: 'row', gap: 6, alignItems: 'center' },
    topEmoji: { fontSize: 16 },
    topText: { fontSize: 13, fontFamily: fonts.bodyBold, color: colors.foreground },
    sosBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 36, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: colors.danger },
    sosText: { fontSize: 12, fontFamily: fonts.bodyBold, color: colors.card, letterSpacing: 0.5 },

    sheet: {
        position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '72%',
        backgroundColor: colors.card, borderTopWidth: 1, borderColor: colors.border,
        borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg,
    },
    sheetContent: { paddingHorizontal: 12, paddingTop: 8 },
    handle: { alignSelf: 'center', width: 40, height: 4, backgroundColor: colors.border, borderRadius: radius.pill, marginBottom: 12 },

    cancelledBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 10, borderRadius: radius.sm, backgroundColor: '#FDECEC', borderWidth: 1, borderColor: colors.danger },
    cancelledText: { fontSize: 13, fontFamily: fonts.bodyBold, color: colors.danger },

    riderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.divider },
    riderAvatar: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.chipBg, alignItems: 'center', justifyContent: 'center' },
    riderInitial: { fontSize: 15, fontFamily: fonts.displayBold, color: colors.primary },
    riderName: { fontSize: 14, fontFamily: fonts.bodyBold, color: colors.foreground },
    riderMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    riderMeta: { fontSize: 12, fontFamily: fonts.body, color: colors.mutedForeground },
    callBtn: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },

    searchingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.divider },
    searchingIcon: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.chipBg, alignItems: 'center', justifyContent: 'center' },

    stops: { paddingTop: 12, gap: 6 },
    stopRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    stopDot: { width: 22, height: 22, borderRadius: radius.pill, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
    stopLabel: { fontSize: 10, fontFamily: fonts.bodyBold, color: colors.mutedForeground, letterSpacing: 0.5, textTransform: 'uppercase' },
    stopValue: { fontSize: 13, fontFamily: fonts.body, color: colors.foreground },
    stopDash: { height: 10, width: 1, backgroundColor: colors.border, marginLeft: 11 },

    notes: { marginTop: 12, backgroundColor: colors.chipBg, padding: 10, borderRadius: radius.sm },
    notesLabel: { fontSize: 10, fontFamily: fonts.bodyBold, color: colors.mutedForeground, letterSpacing: 0.5, textTransform: 'uppercase' },
    notesText: { fontSize: 12, fontFamily: fonts.body, color: colors.foreground, marginTop: 3 },
    recipient: { fontSize: 11, color: colors.mutedForeground, fontFamily: fonts.bodyBold, marginTop: 6 },

    fareRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 14 },
    fareLabel: { fontSize: 11, fontFamily: fonts.bodyBold, color: colors.mutedForeground, letterSpacing: 0.5, textTransform: 'uppercase' },
    fareValue: { fontSize: 26, fontFamily: fonts.displayBold, color: colors.foreground, marginTop: 3, letterSpacing: -0.5 },
    fareMeta: { alignItems: 'flex-end', gap: 3 },
    fareMetaText: { fontSize: 11, fontFamily: fonts.body, color: colors.mutedForeground },

    otpBanner: { marginTop: 14, padding: 12, borderRadius: radius.md, backgroundColor: colors.chipBg, borderWidth: 1, borderColor: colors.primary },
    otpBannerHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    otpBannerIcon: { width: 30, height: 30, borderRadius: radius.pill, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
    otpBannerTitle: { fontSize: 12, fontFamily: fonts.bodyBold, color: colors.foreground, letterSpacing: 0.2 },
    otpBannerText: { fontSize: 11, fontFamily: fonts.body, color: colors.mutedForeground, marginTop: 2, lineHeight: 15 },
    otpDigitsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 12 },
    otpDigitBox: {
        width: 48, height: 56,
        borderWidth: 1.5, borderColor: colors.foreground, borderRadius: radius.md,
        backgroundColor: colors.card,
        alignItems: 'center', justifyContent: 'center',
    },
    otpDigitText: { fontSize: 24, fontFamily: fonts.displayBold, color: colors.foreground, letterSpacing: 1 },

    rateOpener: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.accent, backgroundColor: colors.card },
    rateOpenerText: { fontSize: 13, fontFamily: fonts.bodyBold, color: colors.foreground },
    ratedCard: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.chipBg },
    ratedText: { fontSize: 13, fontFamily: fonts.body, color: colors.foreground },
});

