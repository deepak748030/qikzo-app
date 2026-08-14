import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, Linking } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Phone, Star, MapPin, Navigation2, IndianRupee, Clock, User, CircleCheck, CircleX } from 'lucide-react-native';
import { colors, fonts, radius } from '@/lib/theme';
import ScreenHeader from '@/components/ScreenHeader';
import LeafletMap from '@/components/LeafletMap';
import { tripsApi } from '@/lib/api/endpoints/trips';
import { ratingsApi } from '@/lib/api/endpoints/ratings';
import type { Trip, Booking } from '@/lib/api/types';

// Rider-side trip receipt. Aggregates the Trip + populated Booking + Rating
// so the rider can see everything about a finished / cancelled job — pickup
// & drop with coords, fare breakdown, tip, star rating, timestamps, etc.
export default function TripDetails() {
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
            <View style={styles.container}>
                <ScreenHeader title="Trip details" />
                <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
            </View>
        );
    }
    if (error || !trip) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="Trip details" />
                <View style={styles.center}><Text style={styles.meta}>{error || 'Trip not found'}</Text></View>
            </View>
        );
    }

    const booking = typeof trip.booking === 'object' ? (trip.booking as Booking) : null;
    const rider = typeof trip.rider === 'object' ? (trip.rider as any) : null;
    const cancelled = trip.stage === 'cancelled';
    const customer: any = booking?.user && typeof booking.user === 'object' ? booking.user : null;
    const customerName = customer?.name || 'Customer';
    const customerPhone = customer?.phone || booking?.recipientPhone || '';

    const fmtDate = (v?: string | null) => v ? new Date(v).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    }) : '—';

    const startedAt = trip.startedAt ? new Date(trip.startedAt).getTime() : null;
    const endedAt = (cancelled ? trip.cancelledAt : trip.completedAt);
    const endedMs = endedAt ? new Date(endedAt).getTime() : null;
    const computedMin = (startedAt && endedMs) ? Math.max(0, Math.round((endedMs - startedAt) / 60000)) : 0;
    const durationMin = trip.durationMin || computedMin;

    const tip = Number(rating?.tip || 0);
    const stars = Number(rating?.stars || 0);
    const total = cancelled ? 0 : (Number(trip.fare || booking?.price || 0) + tip);

    // Route map — mirrors the customer app's activity-details view. Plots
    // pickup, every extra pickup stop, and drop with the road route.
    const coordOf = (p: any): { lat: number; lng: number } | null => {
        if (p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng))) {
            return { lat: Number(p.lat), lng: Number(p.lng) };
        }
        return null;
    };
    const pickupCoord = coordOf(booking?.pickup);
    const dropCoord = coordOf(booking?.drop);
    const extraStops = Array.isArray((booking as any)?.extraPickups)
        ? ((booking as any).extraPickups as any[])
        : [];
    const extraStopCoords = extraStops
        .map(coordOf)
        .filter((c): c is { lat: number; lng: number } => !!c);

    return (
        <View style={styles.container}>
            <ScreenHeader title="Trip details" />
            <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 40 }}>
                {/* Route map — same as the customer app's booking details */}
                {pickupCoord && dropCoord ? (
                    <View style={styles.mapWrap}>
                        <LeafletMap
                            center={pickupCoord}
                            pickup={pickupCoord}
                            extraStops={extraStopCoords}
                            drop={dropCoord}
                            showTraffic={false}
                            style={styles.map}
                        />
                    </View>
                ) : null}
                {/* Status banner */}
                <View style={[styles.banner, cancelled ? styles.bannerCancel : styles.bannerDone]}>
                    {cancelled ? <CircleX size={22} color="#9B2226" /> : <CircleCheck size={22} color="#1B7A3E" />}
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.bannerTitle, cancelled ? { color: '#9B2226' } : { color: '#1B7A3E' }]}>
                            {cancelled ? 'Cancelled' : 'Completed'}
                        </Text>
                        <Text style={styles.bannerSub}>
                            {fmtDate(endedAt as any)}{booking?.code ? ` · #${booking.code}` : ''}
                        </Text>
                        {cancelled && trip.cancelReason ? (
                            <Text style={styles.bannerSub} numberOfLines={2}>Reason: {trip.cancelReason}</Text>
                        ) : null}
                    </View>
                </View>

                {/* Earnings summary — hidden when cancelled */}
                {!cancelled && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Earnings</Text>
                        <RowKV label="Base fare" value={`₹${Number(trip.fare || booking?.price || 0).toFixed(0)}`} />
                        {tip > 0 && <RowKV label="Customer tip" value={`+ ₹${tip}`} accent />}
                        <View style={styles.hr} />
                        <RowKV label="Total earned" value={`₹${total}`} bold />
                        <RowKV label="Payment" value={(booking?.payment || 'cash').toUpperCase()} />
                    </View>
                )}

                {/* Customer rating */}
                {!cancelled && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Customer feedback</Text>
                        {stars > 0 ? (
                            <>
                                <View style={{ flexDirection: 'row', gap: 4, marginTop: 2 }}>
                                    {[1, 2, 3, 4, 5].map(n => (
                                        <Star key={n} size={18} color="#F5B301" fill={n <= stars ? '#F5B301' : 'transparent'} />
                                    ))}
                                </View>
                                {rating?.comment ? <Text style={styles.comment}>“{rating.comment}”</Text> : null}
                            </>
                        ) : (
                            <Text style={styles.meta}>Not rated yet.</Text>
                        )}
                    </View>
                )}

                {/* Route */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Route</Text>
                    <View style={styles.stopRow}>
                        <View style={[styles.dot, { backgroundColor: '#1B7A3E' }]} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.stopLabel}>{extraStops.length > 0 ? 'Pickup 1' : 'Pickup'}</Text>
                            <Text style={styles.stopText}>{booking?.pickup?.address || '—'}</Text>
                        </View>
                    </View>
                    {extraStops.map((s: any, i: number) => (
                        <React.Fragment key={i}>
                            <View style={styles.stopBar} />
                            <View style={styles.stopRow}>
                                <View style={[styles.dot, { backgroundColor: '#1B7A3E', opacity: 0.6 }]} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.stopLabel}>Pickup {i + 2}</Text>
                                    <Text style={styles.stopText}>{s?.address || '—'}</Text>
                                </View>
                            </View>
                        </React.Fragment>
                    ))}
                    <View style={styles.stopBar} />
                    <View style={styles.stopRow}>
                        <MapPin size={14} color={colors.primary} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.stopLabel}>Drop</Text>
                            <Text style={styles.stopText}>{booking?.drop?.address || '—'}</Text>
                        </View>
                    </View>
                    <View style={styles.hr} />
                    <View style={styles.gridRow}>
                        <IconStat icon={<Navigation2 size={14} color={colors.foreground} />} label="Distance" value={`${(trip.distanceKm || booking?.distanceKm || 0).toFixed(1)} km`} />
                        <IconStat icon={<Clock size={14} color={colors.foreground} />} label="Duration" value={durationMin ? `${durationMin} min` : '—'} />
                        <IconStat icon={<IndianRupee size={14} color={colors.foreground} />} label="Fare" value={`₹${trip.fare || booking?.price || 0}`} />
                    </View>
                </View>

                {/* Customer */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Customer</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={styles.avatar}><User size={18} color={colors.primary} /></View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.stopText}>{customerName}</Text>
                            {customerPhone ? <Text style={styles.meta}>{customerPhone}</Text> : null}
                        </View>
                        {customerPhone ? (
                            <Pressable style={styles.callBtn} onPress={() => Linking.openURL(`tel:${customerPhone}`)}>
                                <Phone size={16} color={colors.primaryForeground} />
                                <Text style={styles.callTxt}>Call</Text>
                            </Pressable>
                        ) : null}
                    </View>
                </View>

                {/* Timeline */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Timeline</Text>
                    <RowKV label="Accepted" value={fmtDate(trip.assignedAt)} />
                    <RowKV label="Arriving" value={fmtDate(trip.arrivingAt)} />
                    <RowKV label="Arrived" value={fmtDate(trip.arrivedAt)} />
                    <RowKV label="Picked up" value={fmtDate(trip.startedAt)} />
                    <RowKV label={cancelled ? 'Cancelled' : 'Delivered'} value={fmtDate(endedAt as any)} />
                </View>

                {/* Meta */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Reference</Text>
                    <RowKV label="Booking" value={booking?.code || String(booking?._id || '').slice(-6).toUpperCase()} />
                    <RowKV label="Trip ID" value={String(trip._id).slice(-8).toUpperCase()} />
                    {rider?.name ? <RowKV label="Rider" value={rider.name} /> : null}
                </View>
            </ScrollView>
        </View>
    );
}

function RowKV({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: boolean }) {
    return (
        <View style={styles.kv}>
            <Text style={styles.kvLabel}>{label}</Text>
            <Text style={[styles.kvValue, bold && { fontFamily: fonts.displayBold, fontSize: 15 }, accent && { color: '#1B7A3E' }]}>{value}</Text>
        </View>
    );
}

function IconStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <View style={styles.stat}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                {icon}
                <Text style={styles.statLabel}>{label}</Text>
            </View>
            <Text style={styles.statValue}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    mapWrap: { height: 180, borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, marginBottom: 10 },
    map: { flex: 1 },
    meta: { fontSize: 12, fontFamily: fonts.body, color: colors.mutedForeground },
    banner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.md, borderWidth: 1, marginBottom: 10 },
    bannerDone: { backgroundColor: '#E8F7EE', borderColor: '#B7E4C7' },
    bannerCancel: { backgroundColor: '#FCECEC', borderColor: '#F5C2C7' },
    bannerTitle: { fontSize: 15, fontFamily: fonts.displayBold },
    bannerSub: { fontSize: 11, fontFamily: fonts.body, color: colors.mutedForeground, marginTop: 2 },
    card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, marginBottom: 10 },
    cardTitle: { fontSize: 12, fontFamily: fonts.displayBold, color: colors.foreground, marginBottom: 8, letterSpacing: 0.3, textTransform: 'uppercase' },
    kv: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
    kvLabel: { fontSize: 12, fontFamily: fonts.body, color: colors.mutedForeground },
    kvValue: { fontSize: 13, fontFamily: fonts.bodyBold, color: colors.foreground },
    hr: { height: 1, backgroundColor: colors.divider, marginVertical: 8 },
    comment: { fontSize: 12, fontFamily: fonts.body, color: colors.foreground, marginTop: 6, fontStyle: 'italic' },
    stopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 4 },
    stopBar: { width: 2, height: 12, backgroundColor: colors.divider, marginLeft: 6 },
    dot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
    stopLabel: { fontSize: 10, fontFamily: fonts.bodyBold, color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.4 },
    stopText: { fontSize: 13, fontFamily: fonts.bodyBold, color: colors.foreground, marginTop: 2 },
    gridRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
    stat: { flex: 1, padding: 8, borderRadius: radius.sm, backgroundColor: colors.chipBg },
    statLabel: { fontSize: 10, fontFamily: fonts.bodyBold, color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.3 },
    statValue: { fontSize: 13, fontFamily: fonts.displayBold, color: colors.foreground, marginTop: 4 },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.chipBg, alignItems: 'center', justifyContent: 'center' },
    callBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.sm },
    callTxt: { color: colors.primaryForeground, fontFamily: fonts.bodyBold, fontSize: 12 },
});
