import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { PhoneCall, X, NotebookPen, Bike, Star, BadgeCheck, MapPinned, Flag, Radar, KeyRound, ShieldCheck, Gift, Send } from 'lucide-react-native';
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
import { TextInput } from 'react-native';

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

    // Rating + tip state (visible once booking is Delivered).
    const [existingRating, setExistingRating] = useState<any | null>(null);
    const [ratingStars, setRatingStars] = useState(0);
    const [ratingComment, setRatingComment] = useState('');
    const [ratingTip, setRatingTip] = useState<number>(0);
    const [ratingSubmitting, setRatingSubmitting] = useState(false);

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

    const submitRating = async () => {
        if (!serverBookingId || !ratingStars) return;
        setRatingSubmitting(true);
        try {
            const res = await ratingsApi.submit({
                bookingId: serverBookingId,
                stars: ratingStars,
                comment: ratingComment.trim() || undefined,
                tip: ratingTip > 0 ? ratingTip : undefined,
            });
            setExistingRating(res?.rating || { stars: ratingStars, comment: ratingComment, tip: ratingTip });
            sheet.show({ variant: 'success', title: 'Thanks for the feedback!', message: ratingTip > 0 ? `Your ${ratingStars}★ rating and ₹${ratingTip} tip were sent to the rider.` : `Your ${ratingStars}★ rating was sent to the rider.`, confirmText: 'OK', onConfirm: () => sheet.hide() });
        } catch (e: any) {
            sheet.show({ variant: 'error', title: 'Could not submit', message: e?.message || 'Please try again.', confirmText: 'OK', onConfirm: () => sheet.hide() });
        } finally {
            setRatingSubmitting(false);
        }
    };

    // Reset the dismissed latch if the booking cycles back to searching
    // (e.g. rider cancelled, we're re-dispatching).
    useEffect(() => {
        if (booking?.status === 'Searching rider') setAcceptedDismissed(false);
    }, [booking?.status]);

    // Subscribe to the assigned rider's live location for the map preview.
    const riderId = booking?.rider?.id;
    useEffect(() => {
        if (!riderId) { setRiderLoc(null); return; }
        try { connectSocket(); } catch {}
        const off = subscribeSocket('rider:location', (p: any) => {
            if (!p || String(p.id) !== String(riderId)) return;
            if (typeof p.lat !== 'number' || typeof p.lng !== 'number') return;
            setRiderLoc({ lat: p.lat, lng: p.lng });
        });
        return () => { off(); };
    }, [riderId]);

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

    return (
        <View style={styles.container}>
            <ScreenHeader title={`Booking #${booking.id}`} />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}>
                {/* Live map — shown as soon as the trip has pickup coords.
                    Once a rider accepts, their live location is overlaid too so
                    the user can see them moving toward pickup. */}
                {booking.pickupCoord && booking.status !== 'Cancelled' ? (
                    <View style={styles.mapWrap}>
                        <LeafletMap
                            center={riderLoc || booking.pickupCoord}
                            pickup={booking.pickupCoord}
                            drop={booking.dropCoord || null}
                            riderLocation={riderLoc && riderId ? { lat: riderLoc.lat, lng: riderLoc.lng } : null}
                            showTraffic={false}
                            style={styles.map}
                        />
                    </View>
                ) : null}

                {/* Status banner */}
                <View style={styles.statusBanner}>
                    <View style={styles.statusIconWrap}>
                        {booking.status === 'Searching rider' ? (
                            <View style={styles.searchingWrap}>
                                <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseScale }], opacity: pulseOpacity }]} />
                                <AnimatedIcon Icon={Radar} size={26} color={colors.foreground} variant="spin" strokeWidth={1.8} />
                            </View>
                        ) : booking.status === 'Delivered' ? (
                            <AnimatedIcon Icon={BadgeCheck} size={28} color={colors.success} variant="pulse" />
                        ) : booking.status === 'Cancelled' ? (
                            <X size={28} color={colors.danger} />
                        ) : (
                            <AnimatedIcon Icon={Bike} size={26} color={colors.foreground} variant="bounce" />
                        )}
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.statusTitle}>{booking.status}</Text>
                        <Text style={styles.statusSub}>
                            {booking.status === 'Searching rider' && 'Finding the nearest captain for you...'}
                            {booking.status === 'Rider accepted' && `${booking.rider?.name?.split(' ')[0]} is heading to pickup`}
                            {booking.status === 'Arriving for pickup' && 'Rider has reached the pickup spot'}
                            {booking.status === 'Picked up' && 'Items picked up, on the way to drop'}
                            {booking.status === 'On the way' && `Arriving in ~${booking.etaMin} min`}
                            {booking.status === 'Delivered' && 'Successfully delivered. Thanks for using Qikzo!'}
                            {booking.status === 'Cancelled' && 'This booking was cancelled.'}
                        </Text>
                    </View>
                </View>

                {/* Pickup OTP card — generated the moment the rider taps
                    "I've arrived" in their app (status flips to
                    "Arriving for pickup"). The 4 digits are derived
                    deterministically from the booking id so the same code
                    persists across refreshes. User reads it out; rider
                    enters it in their app to start the trip. */}
                {booking.status === 'Arriving for pickup' ? (
                    <View style={styles.otpCard}>
                        <View style={styles.otpHead}>
                            <View style={styles.otpIconWrap}>
                                <ShieldCheck size={16} color={colors.foreground} strokeWidth={2.2} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.otpTitle}>Share this pickup OTP</Text>
                                <Text style={styles.otpSub}>
                                    Your rider has arrived. Read this code out loud so they can start the trip.
                                </Text>
                            </View>
                        </View>
                        <View style={styles.otpDigitsRow}>
                            {pickupOtpFor(booking.id).split('').map((d, i) => (
                                <View key={i} style={styles.otpDigitBox}>
                                    <Text style={styles.otpDigitText}>{d}</Text>
                                </View>
                            ))}
                        </View>
                        <View style={styles.otpFootRow}>
                            <KeyRound size={11} color={colors.mutedForeground} />
                            <Text style={styles.otpFootText}>Never share this code with anyone else.</Text>
                        </View>
                    </View>
                ) : null}


                {/* Timeline */}
                {booking.status !== 'Cancelled' ? (
                    <View style={styles.timeline}>
                        {FLOW.map((step, i) => {
                            const done = i <= currentIdx;
                            const current = i === currentIdx;
                            const isLast = i === FLOW.length - 1;
                            return (
                                <View key={step} style={[styles.timelineRow, isLast && { minHeight: 0 }]}>
                                    <View style={styles.timelineLeft}>
                                        <View style={[styles.timelineDot, done && styles.timelineDotDone, current && styles.timelineDotCurrent]} />
                                        {!isLast ? (
                                            <View style={[styles.timelineBar, done && styles.timelineBarDone]} />
                                        ) : null}
                                    </View>
                                    <Text style={[styles.timelineText, done && styles.timelineTextDone, isLast && { paddingBottom: 0 }]}>{step}</Text>
                                </View>
                            );
                        })}
                    </View>
                ) : null}

                {/* Rider card */}
                {booking.rider && booking.status !== 'Cancelled' ? (
                    <View style={styles.riderCard}>
                        <View style={styles.riderAvatar}><Text style={styles.riderAvatarText}>{booking.rider.name.charAt(0)}</Text></View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.riderName}>{booking.rider.name}</Text>
                            <View style={styles.riderMetaRow}>
                                <Star size={11} color={colors.accent} fill={colors.accent} />
                                <Text style={styles.riderMeta}>{booking.rider.rating} · {booking.rider.trips} trips</Text>
                            </View>
                            <Text style={styles.riderVehicle}>{booking.rider.vehicle} · {booking.rider.vehicleNo}</Text>
                        </View>
                        <Pressable style={styles.callBtn} onPress={onCallRider}>
                            <AnimatedIcon Icon={PhoneCall} size={16} color={colors.foreground} variant="pulse" />
                        </Pressable>
                    </View>
                ) : null}

                {/* Rate your rider — appears after Delivered. Users can rate 1-5,
                    leave an optional comment, and add a tip. All of this is for
                    the rider only. */}
                {booking.status === 'Delivered' && booking.rider ? (
                    existingRating ? (
                        <View style={styles.rateCard}>
                            <View style={styles.rateHead}>
                                <BadgeCheck size={16} color={colors.success} />
                                <Text style={styles.rateTitle}>You rated {booking.rider.name.split(' ')[0]}</Text>
                            </View>
                            <View style={styles.starRow}>
                                {[1,2,3,4,5].map((n) => (
                                    <Star key={n} size={22} color={colors.accent} fill={n <= (existingRating.stars || 0) ? colors.accent : 'transparent'} />
                                ))}
                            </View>
                            {existingRating.comment ? (
                                <Text style={styles.rateComment}>“{existingRating.comment}”</Text>
                            ) : null}
                            {existingRating.tip > 0 ? (
                                <View style={styles.tipBadge}>
                                    <Gift size={12} color={colors.foreground} />
                                    <Text style={styles.tipBadgeText}>Tip sent · ₹{existingRating.tip}</Text>
                                </View>
                            ) : null}
                        </View>
                    ) : (
                        <View style={styles.rateCard}>
                            <View style={styles.rateHead}>
                                <Star size={16} color={colors.accent} fill={colors.accent} />
                                <Text style={styles.rateTitle}>Rate your rider</Text>
                            </View>
                            <Text style={styles.rateSub}>How was your ride with {booking.rider.name.split(' ')[0]}?</Text>
                            <View style={styles.starRow}>
                                {[1,2,3,4,5].map((n) => (
                                    <Pressable key={n} onPress={() => setRatingStars(n)} hitSlop={6}>
                                        <Star size={30} color={colors.accent} fill={n <= ratingStars ? colors.accent : 'transparent'} strokeWidth={1.6} />
                                    </Pressable>
                                ))}
                            </View>
                            <TextInput
                                value={ratingComment}
                                onChangeText={setRatingComment}
                                placeholder="Leave a note for the rider (optional)"
                                placeholderTextColor={colors.mutedForeground}
                                multiline
                                maxLength={500}
                                style={styles.rateInput}
                            />
                            <View style={styles.tipHeadRow}>
                                <Gift size={13} color={colors.foreground} />
                                <Text style={styles.tipHead}>Add a tip for the rider</Text>
                            </View>
                            <View style={styles.tipChipsRow}>
                                {[0, 20, 50, 100].map((amt) => {
                                    const on = ratingTip === amt;
                                    return (
                                        <Pressable
                                            key={amt}
                                            onPress={() => setRatingTip(amt)}
                                            style={[styles.tipChip, on && styles.tipChipOn]}
                                        >
                                            <Text style={[styles.tipChipText, on && styles.tipChipTextOn]}>
                                                {amt === 0 ? 'No tip' : `₹${amt}`}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                            <Button
                                label={ratingTip > 0 ? `Submit · ₹${ratingTip} tip` : 'Submit rating'}
                                onPress={submitRating}
                                loading={ratingSubmitting}
                                disabled={!ratingStars || ratingSubmitting}
                                style={{ marginTop: 12 }}
                            />
                        </View>
                    )
                ) : null}


                {/* Trip card — green location card matching the brand */}
                <View style={styles.tripCard}>
                    <View style={styles.tripRow}>
                        <View style={styles.tripIconCol}>
                            <View style={styles.pinBubble}><MapPinned size={14} color="#FFFFFF" /></View>
                            <View style={styles.pinLine} />
                            <View style={styles.pinBubble}><Flag size={14} color="#FFFFFF" /></View>
                        </View>
                        <View style={{ flex: 1, gap: 12 }}>
                            <View>
                                <Text style={styles.tripLabel}>My Location</Text>
                                <Text style={styles.tripText} numberOfLines={2}>{booking.pickup}</Text>
                            </View>
                            <View>
                                <Text style={styles.tripLabel}>Drop</Text>
                                <Text style={styles.tripText} numberOfLines={2}>{booking.drop}</Text>
                            </View>
                        </View>
                    </View>
                    <View style={styles.tripStats}>
                        <View style={styles.tripStat}>
                            <MapPinned size={11} color="rgba(255,255,255,0.9)" />
                            <Text style={styles.tripStatText}>{booking.distanceKm.toFixed(1)} km</Text>
                        </View>
                        <View style={styles.tripStat}>
                            <Bike size={11} color="rgba(255,255,255,0.9)" />
                            <Text style={styles.tripStatText}>~{booking.etaMin} min</Text>
                        </View>
                        <View style={styles.tripStat}>
                            <Text style={{ fontSize: 13 }}>{category?.emoji}</Text>
                            <Text style={styles.tripStatText}>{category?.name}</Text>
                        </View>
                    </View>
                </View>

                {/* Items / notes */}
                <View style={styles.notesCard}>
                    <View style={styles.notesHead}>
                        <NotebookPen size={14} color={colors.foreground} />
                        <Text style={styles.sectionLabel}>Items / notes for rider</Text>
                    </View>
                    <Text style={styles.notesText}>{booking.notes}</Text>
                    {booking.recipientPhone ? (
                        <Text style={styles.recipient}>Recipient: +91 {booking.recipientPhone}</Text>
                    ) : null}
                </View>

                {/* Fare card */}
                <View style={styles.fareCard}>
                    <Text style={styles.sectionLabel}>Fare</Text>
                    <View style={styles.fareRow}><Text style={styles.fareLabel}>Base fare</Text><Text style={styles.fareValue}>₹25</Text></View>
                    <View style={styles.fareRow}><Text style={styles.fareLabel}>Distance ({booking.distanceKm.toFixed(1)} km)</Text><Text style={styles.fareValue}>₹{booking.price - 25}</Text></View>
                    <View style={styles.fareDivider} />
                    <View style={styles.fareRow}><Text style={styles.fareTotalLabel}>Total</Text><Text style={styles.fareTotal}>₹{booking.price}</Text></View>
                    <Text style={styles.payHint}>{booking.payment === 'cash' ? 'Pay rider in cash on delivery' : 'Paying via UPI'}</Text>
                </View>
            </ScrollView>

            {/* Sticky action footer */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}>
                {isActive ? (
                    <Button label="Cancel booking" variant="outline" loading={cancelling} onPress={onCancel} />
                ) : (
                    <Button label="Book another" onPress={() => router.replace('/book-delivery')} />
                )}
            </View>

            <BottomSheet visible={sheet.visible} {...sheet.config} onClose={sheet.hide} />

            {/* Full-screen immersive stage overlays: searching / accepted / delivered */}
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

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    missing: { fontSize: 14, color: colors.mutedForeground, fontFamily: fonts.body },

    mapWrap: {
        marginTop: 0, marginHorizontal: 0, height: 240,
        borderBottomWidth: 1, borderBottomColor: colors.border,
        overflow: 'hidden', backgroundColor: colors.card,
    },
    map: { flex: 1 },

    statusBanner: {
        marginTop: 8, marginHorizontal: 6, padding: 10, flexDirection: 'row', gap: 10,
        borderWidth: 1, borderColor: colors.foreground, borderRadius: radius.md, backgroundColor: colors.card,
    },
    statusIconWrap: { width: 46, height: 46, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
    searchingWrap: { alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' },
    pulseRing: { position: 'absolute', width: 30, height: 30, borderWidth: 1, borderColor: colors.foreground, borderRadius: radius.md },
    statusTitle: { fontSize: 16, fontFamily: fonts.displayBold, color: colors.foreground },
    statusSub: { fontSize: 12, color: colors.mutedForeground, fontFamily: fonts.body, marginTop: 2 },

    timeline: { marginTop: 8, marginHorizontal: 6, paddingVertical: 10, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.card },
    timelineRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, minHeight: 28 },
    timelineLeft: { alignItems: 'center', width: 10, alignSelf: 'stretch' },
    timelineDot: { width: 10, height: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, borderRadius: radius.md, marginTop: 3 },
    timelineDotDone: { backgroundColor: colors.foreground, borderColor: colors.foreground },
    timelineDotCurrent: { backgroundColor: colors.accent, borderColor: colors.accent },
    timelineBar: { flex: 1, width: 1, backgroundColor: colors.border, marginTop: 2, marginBottom: 0 },
    timelineBarDone: { backgroundColor: colors.foreground },
    timelineText: { fontSize: 12, fontFamily: fonts.body, color: colors.mutedForeground, paddingBottom: 12, flex: 1, lineHeight: 16 },
    timelineTextDone: { color: colors.foreground, fontFamily: fonts.bodyBold },

    riderCard: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, marginHorizontal: 6, padding: 10, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.card },
    riderAvatar: { width: 42, height: 42, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
    riderAvatarText: { color: colors.primaryForeground, fontFamily: fonts.displayBold, fontSize: 18 },
    riderName: { fontSize: 14, fontFamily: fonts.bodyBold, color: colors.foreground },
    riderMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    riderMeta: { fontSize: 11, color: colors.mutedForeground, fontFamily: fonts.body },
    riderVehicle: { fontSize: 11, color: colors.mutedForeground, fontFamily: fonts.body, marginTop: 2 },
    callBtn: { width: 36, height: 36, borderWidth: 1, borderColor: colors.foreground, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },

    tripCard: { marginTop: 8, marginHorizontal: 6, padding: 12, borderRadius: radius.lg, backgroundColor: colors.primary },
    sectionLabel: { fontSize: 11, fontFamily: fonts.bodyBold, color: colors.mutedForeground, letterSpacing: 0.4, textTransform: 'uppercase' },
    tripRow: { flexDirection: 'row', gap: 12, marginTop: 2 },
    tripIconCol: { alignItems: 'center', width: 28, paddingTop: 2 },
    pinBubble: { width: 28, height: 28, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
    pin: { width: 10, height: 10, borderRadius: radius.pill },
    pinLine: { flex: 1, width: 2, backgroundColor: 'rgba(255,255,255,0.35)', marginVertical: 4, minHeight: 18 },
    tripLabel: { fontSize: 10, fontFamily: fonts.bodyBold, color: 'rgba(255,255,255,0.85)', letterSpacing: 0.3 },
    tripText: { fontSize: 13, fontFamily: fonts.bodyBold, color: '#FFFFFF', marginTop: 2 },
    tripStats: { flexDirection: 'row', gap: 14, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' },
    tripStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    tripStatText: { fontSize: 11, color: '#FFFFFF', fontFamily: fonts.bodyBold },

    notesCard: { marginTop: 8, marginHorizontal: 6, padding: 10, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.card },
    notesHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    notesText: { fontSize: 13, fontFamily: fonts.body, color: colors.foreground, lineHeight: 19 },
    recipient: { fontSize: 11, color: colors.mutedForeground, fontFamily: fonts.bodyBold, marginTop: 8 },

    fareCard: { marginTop: 8, marginHorizontal: 6, padding: 10, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.card },
    fareRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, marginTop: 4 },
    fareLabel: { fontSize: 12, color: colors.mutedForeground, fontFamily: fonts.body },
    fareValue: { fontSize: 12, color: colors.foreground, fontFamily: fonts.bodyBold },
    fareDivider: { height: 1, backgroundColor: colors.divider, marginVertical: 4 },
    fareTotalLabel: { fontSize: 14, color: colors.foreground, fontFamily: fonts.displayBold },
    fareTotal: { fontSize: 16, color: colors.foreground, fontFamily: fonts.displayBold },
    payHint: { fontSize: 11, color: colors.mutedForeground, fontFamily: fonts.body, marginTop: 6 },

    otpCard: {
        marginTop: 8, marginHorizontal: 6, padding: 14,
        borderWidth: 1.5, borderColor: colors.foreground, borderRadius: radius.md,
        backgroundColor: colors.card,
    },
    otpHead: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
    otpIconWrap: {
        width: 30, height: 30, borderRadius: radius.pill,
        backgroundColor: colors.chipBg, alignItems: 'center', justifyContent: 'center',
    },
    otpTitle: { fontSize: 13, fontFamily: fonts.displayBold, color: colors.foreground, letterSpacing: 0.2 },
    otpSub: { fontSize: 11, fontFamily: fonts.body, color: colors.mutedForeground, marginTop: 2, lineHeight: 15 },
    otpDigitsRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 14 },
    otpDigitBox: {
        width: 56, height: 64,
        borderWidth: 1.5, borderColor: colors.foreground, borderRadius: radius.md,
        backgroundColor: colors.chipBg,
        alignItems: 'center', justifyContent: 'center',
    },
    otpDigitText: { fontSize: 28, fontFamily: fonts.displayBold, color: colors.foreground, letterSpacing: 1 },
    otpFootRow: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
    otpFootText: { fontSize: 10, fontFamily: fonts.body, color: colors.mutedForeground },


    footer: { paddingHorizontal: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card },
    rateCard: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        padding: 14,
        marginTop: 12,
        gap: 8,
    },
    rateHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    rateTitle: { fontSize: 14, fontFamily: fonts.displayBold, color: colors.foreground },
    rateSub: { fontSize: 12, fontFamily: fonts.body, color: colors.mutedForeground },
    starRow: { flexDirection: 'row', gap: 10, marginTop: 4, alignSelf: 'center' },
    rateComment: { fontSize: 12, fontFamily: fonts.body, color: colors.foreground, fontStyle: 'italic', marginTop: 4 },
    rateInput: {
        marginTop: 10,
        minHeight: 60,
        backgroundColor: colors.inputBg,
        borderWidth: 1,
        borderColor: colors.inputBorder,
        borderRadius: radius.sm,
        paddingHorizontal: 10,
        paddingVertical: 8,
        fontFamily: fonts.body,
        fontSize: 13,
        color: colors.foreground,
        textAlignVertical: 'top',
    },
    tipHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
    tipHead: { fontSize: 12, fontFamily: fonts.bodyBold, color: colors.foreground },
    tipChipsRow: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
    tipChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
    },
    tipChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    tipChipText: { fontSize: 12, fontFamily: fonts.bodyBold, color: colors.foreground },
    tipChipTextOn: { color: colors.primaryForeground },
    tipBadge: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.chipBg,
        borderRadius: radius.pill,
        paddingHorizontal: 10,
        paddingVertical: 5,
        marginTop: 4,
    },
    tipBadgeText: { fontSize: 11, fontFamily: fonts.bodyBold, color: colors.foreground },
});
