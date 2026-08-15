import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { X, Phone, Star, MapPin, Navigation2 } from 'lucide-react-native';
import { colors, fonts, radius } from '@/lib/theme';
import ScreenHeader from '@/components/ScreenHeader';
import LeafletMap from '@/components/LeafletMap';
import StageStepper from '@/components/StageStepper';
import { tripsApi } from '@/lib/api/endpoints/trips';
import { ratingsApi } from '@/lib/api/endpoints/ratings';
import type { Trip, Booking } from '@/lib/api/types';
import { CATEGORY_META, type JobCategory } from '@/lib/mockData';

/** Format estimated minutes into a human-friendly string. */
function fmtDuration(min: number): string {
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h < 24) return m > 0 ? `${h} hr ${m} min` : `${h} hr`;
    const d = Math.floor(h / 24);
    const rh = h % 24;
    return rh > 0 ? `${d} day ${rh} hr` : `${d} day`;
}

const CATEGORY_FROM_SLUG: Record<string, JobCategory> = {
    ride: 'ride', bike: 'ride', auto: 'ride', cab: 'ride', sedan: 'ride',
    groceries: 'groceries', food: 'food', medicines: 'medicines',
    parcel: 'parcel', other: 'other',
};

// Rider-side trip receipt — mirrors the customer app's booking-details
// layout: full-bleed route map on top, bottom sheet with the stage stepper,
// customer row, every stop, note, and the earnings summary.
export default function TripDetails() {
    const insets = useSafeAreaInsets();
    const { id } = useLocalSearchParams<{ id: string }>();
    const [trip, setTrip] = useState<Trip | null>(null);
    const [rating, setRating] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!id) return;
        setLoading(true); setError(null);
        try {
            const t = await tripsApi.getOne(String(id));
            setTrip(t);
            const b = typeof t.booking === 'object' ? (t.booking as Booking) : null;
            if (b?._id && t.stage === 'completed') {
                try {
                    const r = await ratingsApi.getForBooking(String(b._id));
                    setRating((r as any).rating);
                } catch { /* rating optional */ }
            }
        } catch (e: any) {
            setError(e?.message || 'Failed to load trip');
        } finally { setLoading(false); }
    }, [id]);

    useEffect(() => { load(); }, [load]);

    if (loading) {
        return (
            <View style={styles.plain}>
                <ScreenHeader title="Trip details" />
                <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
            </View>
        );
    }
    if (error || !trip) {
        return (
            <View style={styles.plain}>
                <ScreenHeader title="Trip details" />
                <View style={styles.center}><Text style={styles.metaText}>{error || 'Trip not found'}</Text></View>
            </View>
        );
    }

    const booking = typeof trip.booking === 'object' ? (trip.booking as Booking) : null;
    const cancelled = trip.stage === 'cancelled';
    const customer: any = booking?.user && typeof booking.user === 'object' ? booking.user : null;
    const customerName = (customer?.name && customer.name !== 'Guest' ? customer.name : 'Customer') as string;
    const customerPhone = customer?.phone || booking?.recipientPhone || '';

    const cat = CATEGORY_META[CATEGORY_FROM_SLUG[booking?.categorySlug || ''] || 'parcel'];
    const code = booking?.code || String(trip._id).slice(-6).toUpperCase();

    // ---- Route geometry (map + stops list) ----
    const coordOf = (p: any): { lat: number; lng: number } | null => {
        if (p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng))) {
            return { lat: Number(p.lat), lng: Number(p.lng) };
        }
        return null;
    };
    const pickupCoord = coordOf(booking?.pickup);
    const dropCoord = coordOf(booking?.drop);
    const extraStops: any[] = Array.isArray((booking as any)?.extraPickups)
        ? ((booking as any).extraPickups as any[])
        : [];
    const extraStopCoords = extraStops
        .map(coordOf)
        .filter((c): c is { lat: number; lng: number } => !!c);
    const showMap = !!pickupCoord && !!dropCoord && !cancelled;

    // ---- Money ----
    const tip = Number(rating?.tip || 0);
    const stars = Number(rating?.stars || 0);
    const fare = Number(trip.fare || booking?.price || 0);
    const total = cancelled ? 0 : fare + tip;

    // ---- Times ----
    const fmtDate = (v?: string | null) => v ? new Date(v).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    }) : '—';
    const endedAt = cancelled ? trip.cancelledAt : trip.completedAt;
    const startedMs = trip.startedAt ? new Date(trip.startedAt).getTime() : null;
    const endedMs = endedAt ? new Date(endedAt).getTime() : null;
    const computedMin = (startedMs && endedMs) ? Math.max(0, Math.round((endedMs - startedMs) / 60000)) : 0;
    const durationMin = trip.durationMin || computedMin || booking?.etaMin || 0;
    const distanceKm = Number(trip.distanceKm || booking?.distanceKm || 0);

    return (
        <View style={styles.container}>
            {/* Full-bleed route map underneath — matches customer booking-details */}
            {showMap ? (
                <LeafletMap
                    center={pickupCoord!}
                    pickup={pickupCoord}
                    extraStops={extraStopCoords}
                    drop={dropCoord}
                    showTraffic={false}
                    style={StyleSheet.absoluteFill}
                />
            ) : (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
            )}

            {/* Top status bar */}
            <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
                <Pressable style={styles.iconBtn} onPress={() => router.back()} hitSlop={6}>
                    <X size={20} color={colors.foreground} />
                </Pressable>
                <View style={styles.topLabel}>
                    <Text style={styles.topEmoji}>{cat.emoji}</Text>
                    <Text style={styles.topText}>{cat.label} · #{code}</Text>
                </View>
                <View style={{ width: 36 }} />
            </View>

            {/* Bottom sheet */}
            <ScrollView
                style={styles.sheet}
                contentContainerStyle={[styles.sheetContent, { paddingBottom: insets.bottom + 16 }]}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.handle} />

                {/* Stage stepper — all ticked for completed, banner for cancelled */}
                {cancelled ? (
                    <View style={styles.cancelledBanner}>
                        <X size={16} color={colors.danger} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.cancelledText}>This trip was cancelled.</Text>
                            {trip.cancelReason ? (
                                <Text style={styles.cancelledReason} numberOfLines={2}>Reason: {trip.cancelReason}</Text>
                            ) : null}
                        </View>
                    </View>
                ) : (
                    <StageStepper stage="Delivered" />
                )}

                {/* Customer row — mirrors customer app's rider row */}
                <View style={styles.personRow}>
                    <View style={styles.personAvatar}>
                        <Text style={styles.personInitial}>{customerName.charAt(0)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.personName}>{customerName}</Text>
                        <View style={styles.personMetaRow}>
                            {stars > 0 ? (
                                <>
                                    <Star size={11} color={colors.accent} fill={colors.accent} />
                                    <Text style={styles.personMeta}>Rated you {stars}★{customerPhone ? ` · ${customerPhone}` : ''}</Text>
                                </>
                            ) : (
                                <Text style={styles.personMeta}>{customerPhone || 'Customer'}</Text>
                            )}
                        </View>
                    </View>
                    {customerPhone ? (
                        <Pressable style={styles.callBtn} onPress={() => Linking.openURL(`tel:${customerPhone}`)}>
                            <Phone size={18} color={colors.primaryForeground} />
                        </Pressable>
                    ) : null}
                </View>

                {/* Stops — pickup / extra pickups / drop */}
                <View style={styles.stops}>
                    <StopRow icon="pickup" label={extraStops.length > 0 ? 'Pickup 1' : 'Pickup'} value={booking?.pickup?.address || '—'} />
                    {extraStops.map((s: any, i: number) => (
                        <React.Fragment key={i}>
                            <View style={styles.stopDash} />
                            <StopRow icon="pickup" label={`Pickup ${i + 2}`} value={s?.address || '—'} />
                        </React.Fragment>
                    ))}
                    <View style={styles.stopDash} />
                    <StopRow icon="drop" label="Drop" value={booking?.drop?.address || '—'} />
                </View>

                {/* Customer note */}
                {booking?.notes || booking?.recipientPhone ? (
                    <View style={styles.notes}>
                        <Text style={styles.notesLabel}>Customer note</Text>
                        {booking?.notes ? <Text style={styles.notesText}>{booking.notes}</Text> : null}
                        {booking?.recipientPhone ? (
                            <Text style={styles.recipient}>Recipient: +91 {booking.recipientPhone}</Text>
                        ) : null}
                    </View>
                ) : null}

                {/* Earnings — mirrors the customer app's "YOU PAY" block */}
                <View style={styles.fareRow}>
                    <View>
                        <Text style={styles.fareLabel}>{cancelled ? 'Earnings' : 'You earned'}</Text>
                        <Text style={styles.fareValue}>₹{total}</Text>
                        {tip > 0 ? <Text style={styles.tipNote}>includes ₹{tip} tip</Text> : null}
                    </View>
                    <View style={styles.fareMeta}>
                        <Text style={styles.fareMetaText}>{distanceKm.toFixed(1)} km{durationMin ? ` · ~${fmtDuration(durationMin)}` : ''}</Text>
                        <Text style={styles.fareMetaText}>Payment: {(booking?.payment || 'cash').toUpperCase()}</Text>
                        <Text style={styles.fareMetaText}>{cancelled ? `Cancelled ${fmtDate(endedAt)}` : `Delivered ${fmtDate(endedAt)}`}</Text>
                    </View>
                </View>

                {/* Customer feedback */}
                {!cancelled && stars > 0 && rating?.comment ? (
                    <View style={styles.feedback}>
                        <Text style={styles.notesLabel}>Customer feedback</Text>
                        <Text style={styles.comment}>“{rating.comment}”</Text>
                    </View>
                ) : null}

                {/* Timeline */}
                <View style={styles.timeline}>
                    <Text style={styles.notesLabel}>Timeline</Text>
                    <TimeRow label="Accepted" value={fmtDate(trip.assignedAt)} />
                    <TimeRow label="Arrived at pickup" value={fmtDate(trip.arrivedAt)} />
                    <TimeRow label="Picked up" value={fmtDate(trip.startedAt)} />
                    <TimeRow label={cancelled ? 'Cancelled' : 'Delivered'} value={fmtDate(endedAt)} />
                </View>
            </ScrollView>
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

function TimeRow({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.timeRow}>
            <Text style={styles.timeLabel}>{label}</Text>
            <Text style={styles.timeValue}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    plain: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    metaText: { fontSize: 12, fontFamily: fonts.body, color: colors.mutedForeground },

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

    sheet: {
        position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '72%',
        backgroundColor: colors.card, borderTopWidth: 1, borderColor: colors.border,
        borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg,
    },
    sheetContent: { paddingHorizontal: 12, paddingTop: 8 },
    handle: { alignSelf: 'center', width: 40, height: 4, backgroundColor: colors.border, borderRadius: radius.pill, marginBottom: 12 },

    cancelledBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 10, borderRadius: radius.sm, backgroundColor: '#FDECEC', borderWidth: 1, borderColor: colors.danger },
    cancelledText: { fontSize: 13, fontFamily: fonts.bodyBold, color: colors.danger },
    cancelledReason: { fontSize: 11, fontFamily: fonts.body, color: colors.mutedForeground, marginTop: 2 },

    personRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.divider },
    personAvatar: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.chipBg, alignItems: 'center', justifyContent: 'center' },
    personInitial: { fontSize: 15, fontFamily: fonts.displayBold, color: colors.primary },
    personName: { fontSize: 14, fontFamily: fonts.bodyBold, color: colors.foreground },
    personMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    personMeta: { fontSize: 12, fontFamily: fonts.body, color: colors.mutedForeground },
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
    recipient: { fontSize: 11, color: colors.mutedForeground, fontFamily: fonts.bodyBold, marginTop: 6 },

    fareRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 14 },
    fareLabel: { fontSize: 11, fontFamily: fonts.bodyBold, color: colors.mutedForeground, letterSpacing: 0.5, textTransform: 'uppercase' },
    fareValue: { fontSize: 26, fontFamily: fonts.displayBold, color: colors.foreground, marginTop: 3, letterSpacing: -0.5 },
    tipNote: { fontSize: 11, fontFamily: fonts.bodyBold, color: '#1B7A3E', marginTop: 2 },
    fareMeta: { alignItems: 'flex-end', gap: 3 },
    fareMetaText: { fontSize: 11, fontFamily: fonts.body, color: colors.mutedForeground },

    feedback: { marginTop: 12, backgroundColor: colors.chipBg, padding: 10, borderRadius: radius.sm },
    comment: { fontSize: 12, fontFamily: fonts.body, color: colors.foreground, marginTop: 4, fontStyle: 'italic' },

    timeline: { marginTop: 12, backgroundColor: colors.chipBg, padding: 10, borderRadius: radius.sm },
    timeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, marginTop: 2 },
    timeLabel: { fontSize: 12, fontFamily: fonts.body, color: colors.mutedForeground },
    timeValue: { fontSize: 12, fontFamily: fonts.bodyBold, color: colors.foreground },
});
