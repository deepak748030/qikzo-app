import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { PhoneCall, X, NotebookPen, Bike, Star, BadgeCheck, MapPinned, Flag, Radar } from 'lucide-react-native';
import AnimatedIcon from '@/components/AnimatedIcon';
import { colors, fonts, radius } from '@/lib/theme';
import ScreenHeader from '@/components/ScreenHeader';
import Button from '@/components/Button';
import BottomSheet from '@/components/BottomSheet';
import { useSheet } from '@/lib/useSheet';
import { useBooking } from '@/lib/bookingStore';
import { BookingStatus, categories } from '@/lib/mockData';

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
    const sheet = useSheet();
    const [cancelling, setCancelling] = useState(false);

    // Auto-progression timer (simulated rider matching + trip).
    useEffect(() => {
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

    const onCancel = () => {
        sheet.show({
            variant: 'warning',
            title: 'Cancel this booking?',
            message: 'The rider will be notified. Repeated cancellations may affect your account.',
            confirmText: 'Yes, cancel',
            cancelText: 'Keep booking',
            onConfirm: () => {
                setCancelling(true);
                setTimeout(() => {
                    updateStatus(booking.id, 'Cancelled');
                    setCancelling(false);
                    sheet.hide();
                }, 600);
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    missing: { fontSize: 14, color: colors.mutedForeground, fontFamily: fonts.body },

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

    footer: { paddingHorizontal: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card },
});
