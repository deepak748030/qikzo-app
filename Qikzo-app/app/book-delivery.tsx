import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Banknote, Wallet, Bike, ChevronRight, MapPin, Home } from 'lucide-react-native';
import { colors, fonts, radius } from '@/lib/theme';
import ScreenHeader from '@/components/ScreenHeader';
import Input from '@/components/Input';
import Button from '@/components/Button';
import BottomSheet from '@/components/BottomSheet';
import LeafletMap from '@/components/LeafletMap';
import { useSheet } from '@/lib/useSheet';
import { categories, estimateTrip, savedPlaces } from '@/lib/mockData';
import AssetIcon from '@/components/AssetIcon';
import { rideOptions, estimateRide } from '@/lib/serviceMode';
import { newBookingId, useBooking } from '@/lib/bookingStore';
import { ApiError } from '@/lib/api/errors';
import { tokenStore } from '@/lib/api/tokenStore';
import { useLiveRiders } from '@/lib/useLiveRiders';

export default function BookDeliveryScreen() {
    const insets = useSafeAreaInsets();
    const draft = useBooking((s) => s.draft);
    const setDraft = useBooking((s) => s.setDraft);
    const addBooking = useBooking((s) => s.addBooking);
    const createOnServer = useBooking((s) => s.createOnServer);
    const resetDraft = useBooking((s) => s.resetDraft);
    const sheet = useSheet();
    const [loading, setLoading] = useState(false);
    // Real road-based distance/duration reported by the map (OSRM). When present it
    // overrides the mock straight-line estimate.
    const [routeInfo, setRouteInfo] = useState<{ distanceKm: number; durationMin: number } | null>(null);

    const isRide = draft.mode === 'ride';

    // Reset the resolved route whenever the endpoints change — the map will fetch a new one.
    React.useEffect(() => {
        setRouteInfo(null);
    }, [draft.pickupCoord?.lat, draft.pickupCoord?.lng, draft.dropCoord?.lat, draft.dropCoord?.lng]);

    const trip = useMemo(() => {
        if (!draft.pickup.trim() || !draft.drop.trim()) return null;
        const base = estimateTrip(draft.pickup, draft.drop);
        // Prefer real road-network distance/duration when the map has resolved a route.
        const distanceKm = routeInfo?.distanceKm ?? base.distanceKm;
        const etaMin = routeInfo ? Math.max(3, Math.round(routeInfo.durationMin)) : base.etaMin;
        const merged = { ...base, distanceKm, etaMin };
        if (isRide) {
            const r = estimateRide(distanceKm, draft.categoryId);
            return { ...merged, ...r, etaMin };
        }
        // Recompute price for delivery when distance changes.
        return { ...merged, price: Math.round(merged.base + distanceKm * merged.perKm) };
    }, [draft.pickup, draft.drop, draft.categoryId, isRide, routeInfo]);

    const openMap = (field: 'pickup' | 'drop') => {
        router.push({ pathname: '/select-location', params: { field } });
    };

    const confirm = async () => {
        if (!draft.pickup.trim() || !draft.drop.trim()) {
            sheet.show({ variant: 'error', title: 'Locations required', message: 'Please set both pickup and drop locations.' });
            return;
        }
        if (!isRide && !draft.notes.trim()) {
            sheet.show({ variant: 'error', title: 'Add a note', message: 'Tell the rider what to pick up — e.g. "2L milk, bread, dal".' });
            return;
        }
        if (!trip) return;
        setLoading(true);

        // Signed-in users create on the server so the booking persists, gets a
        // real id, and is dispatched to riders. Signed-out preview keeps the
        // legacy local flow so the demo stays browsable.
        if (tokenStore.get().accessToken) {
            try {
                const created = await createOnServer({
                    mode: draft.mode,
                    categoryId: draft.categoryId,
                    pickup: {
                        address: draft.pickup.trim(),
                        lat: draft.pickupCoord?.lat ?? null,
                        lng: draft.pickupCoord?.lng ?? null,
                    },
                    drop: {
                        address: draft.drop.trim(),
                        lat: draft.dropCoord?.lat ?? null,
                        lng: draft.dropCoord?.lng ?? null,
                    },
                    notes: draft.notes.trim() || (isRide ? 'Passenger ride' : ''),
                    recipientPhone: draft.recipientPhone.trim() || undefined,
                    payment: draft.payment,
                });
                resetDraft();
                setLoading(false);
                router.replace({ pathname: '/booking-details', params: { id: created.id } });
                return;
            } catch (e) {
                setLoading(false);
                const msg = e instanceof ApiError ? e.message : 'Could not create booking. Please try again.';
                sheet.show({ variant: 'error', title: 'Booking failed', message: msg });
                return;
            }
        }

        // Fallback: local-only booking (no server session).
        const id = newBookingId();
        addBooking({
            id,
            categoryId: draft.categoryId,
            pickup: draft.pickup.trim(),
            drop: draft.drop.trim(),
            notes: draft.notes.trim() || (isRide ? 'Passenger ride' : ''),
            recipientPhone: draft.recipientPhone.trim() || undefined,
            payment: draft.payment,
            distanceKm: trip.distanceKm,
            etaMin: trip.etaMin,
            price: trip.price,
            status: 'Searching rider',
            createdAt: Date.now(),
        });
        setTimeout(() => {
            resetDraft();
            setLoading(false);
            router.replace({ pathname: '/booking-details', params: { id } });
        }, 400);
    };


    const categoryList = isRide ? rideOptions : categories;

    return (
        <View style={styles.container}>
            <ScreenHeader title={isRide ? 'Book a ride' : 'Book a delivery'} />
            <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 160 }}
            >
                {/* Route map preview — always visible at the top, full-bleed.
                    Falls back to a Delhi center when no coords are picked yet. */}
                <View style={styles.mapWrap}>
                    <BookMapWithRiders
                        center={draft.pickupCoord || draft.dropCoord || { lat: 28.6139, lng: 77.2090 }}
                        pickup={draft.pickupCoord || undefined}
                        drop={draft.dropCoord || undefined}
                        onRoute={(r) => setRouteInfo(r)}
                    />
                    {!(draft.pickupCoord || draft.dropCoord) ? (
                        <Pressable style={styles.mapHint} onPress={() => openMap('drop')}>
                            <MapPin size={12} color={colors.primaryForeground} />
                            <Text style={styles.mapHintText}>Tap Trip below to set pickup & drop on map</Text>
                        </Pressable>
                    ) : null}
                </View>

                {/* Category / Ride option chips */}
                <View style={styles.section}>
                    <Text style={styles.label}>{isRide ? 'Ride type' : 'What are you sending?'}</Text>
                    <FlatList
                        horizontal
                        data={categoryList}
                        keyExtractor={(c: any) => c.id}
                        showsHorizontalScrollIndicator={false}
                        ItemSeparatorComponent={() => <View style={{ width: 6 }} />}
                        contentContainerStyle={{ paddingHorizontal: 6 }}
                        renderItem={({ item }: any) => {
                            const active = draft.categoryId === item.id;
                            return (
                                <Pressable
                                    style={[styles.catChip, active && styles.catChipActive]}
                                    onPress={() => setDraft({ categoryId: item.id })}
                                >
                                    <View style={styles.catIconSlot}>
                                        {/* <AssetIcon id={item.id} size={28} /> */}
                                        <AssetIcon id={item.id} size={item.id === 'cab' ? 40 : 28} />
                                    </View>
                                    <Text
                                        style={[styles.catChipLabel, active && styles.catChipLabelActive]}
                                        numberOfLines={1}
                                    >
                                        {item.name}
                                    </Text>
                                </Pressable>
                            );
                        }}
                    />
                </View>

                {/* Trip — map-based location picker */}
                <View style={styles.section}>
                    <Text style={styles.label}>Trip</Text>
                    <View style={styles.tripCard}>
                        <Pressable style={styles.tripRow} onPress={() => openMap('pickup')}>
                            <View style={styles.pinDot}>
                                <MapPin size={14} color="#FFFFFF" />
                            </View>
                            <View style={styles.tripTextWrap}>
                                <Text style={styles.tripFieldLabel}>Pick up</Text>
                                <Text
                                    style={[styles.tripValue, !draft.pickup && styles.tripPlaceholder]}
                                    numberOfLines={2}
                                >
                                    {draft.pickup || 'Tap to set on the map'}
                                </Text>
                            </View>
                            <ChevronRight size={16} color="rgba(255,255,255,0.8)" />
                        </Pressable>
                        <View style={styles.tripDivider} />
                        <Pressable style={styles.tripRow} onPress={() => openMap('drop')}>
                            <View style={styles.pinDot}>
                                <Home size={14} color="#FFFFFF" />
                            </View>
                            <View style={styles.tripTextWrap}>
                                <Text style={styles.tripFieldLabel}>{isRide ? 'Drop / Destination' : 'Drop'}</Text>
                                <Text
                                    style={[styles.tripValue, !draft.drop && styles.tripPlaceholder]}
                                    numberOfLines={2}
                                >
                                    {draft.drop || 'Tap to set on the map'}
                                </Text>
                            </View>
                            <ChevronRight size={16} color="rgba(255,255,255,0.8)" />
                        </Pressable>
                    </View>

                    {/* Saved places shortcut */}
                    <View style={styles.savedRow}>
                        {savedPlaces.map((p) => (
                            <Pressable
                                key={p.id}
                                style={styles.savedChip}
                                onPress={() => setDraft({ drop: p.address, dropCoord: null })}
                            >
                                <Text style={{ fontSize: 12 }}>{p.emoji}</Text>
                                <Text style={styles.savedChipText} numberOfLines={1}>Drop at {p.label}</Text>
                            </Pressable>
                        ))}
                    </View>
                </View>

                {/* Notes — only for deliveries */}
                {!isRide ? (
                    <View style={styles.section}>
                        <Text style={styles.label}>What needs to be picked up?</Text>
                        <View style={styles.noteWrap}>

                            <View style={{ flex: 1, minWidth: 0 }}>
                                <Input
                                    placeholder={'List the items, sizes, brand notes...\ne.g. 2L Amul milk, brown bread, 6 eggs'}
                                    value={draft.notes}
                                    onChangeText={(v) => setDraft({ notes: v })}
                                    multiline
                                    numberOfLines={4}
                                    style={{ minHeight: 70, textAlignVertical: 'top' }}
                                />
                            </View>
                        </View>
                    </View>
                ) : null}

                {/* Recipient phone */}
                <View style={styles.section}>
                    <Text style={styles.label}>
                        {isRide ? 'Co-passenger contact (optional)' : 'Recipient contact (optional)'}
                    </Text>
                    <View style={styles.noteWrap}>

                        <View style={{ flex: 1, minWidth: 0 }}>
                            <Input
                                prefix="+91"
                                placeholder="98765 43210"
                                keyboardType="number-pad"
                                maxLength={10}
                                value={draft.recipientPhone}
                                onChangeText={(v) => setDraft({ recipientPhone: v.replace(/[^0-9]/g, '') })}
                            />
                        </View>
                    </View>
                </View>

                {/* Payment */}
                <View style={styles.section}>
                    <Text style={styles.label}>Payment</Text>
                    <View style={styles.payRow}>
                        <Pressable
                            style={[styles.payBtn, draft.payment === 'cash' && styles.payBtnActive]}
                            onPress={() => setDraft({ payment: 'cash' })}
                        >
                            <Banknote size={16} color={colors.foreground} />
                            <Text style={styles.payText}>Cash</Text>
                        </Pressable>
                        <Pressable
                            style={[styles.payBtn, draft.payment === 'upi' && styles.payBtnActive]}
                            onPress={() => setDraft({ payment: 'upi' })}
                        >
                            <Wallet size={16} color={colors.foreground} />
                            <Text style={styles.payText}>UPI</Text>
                        </Pressable>
                    </View>
                </View>

                {/* Estimate breakdown */}
                {trip ? (
                    <View style={styles.section}>
                        <Text style={styles.label}>Fare estimate</Text>
                        <View style={styles.bill}>
                            <Row label={`Base fare`} value={`₹${trip.base}`} />
                            <Row
                                label={`Distance · ${trip.distanceKm.toFixed(1)} km × ₹${trip.perKm}`}
                                value={`₹${Math.round(trip.distanceKm * trip.perKm)}`}
                            />
                            <View style={styles.billDivider} />
                            <Row label="Total" value={`₹${trip.price}`} bold />
                            <Text style={styles.etaText}>
                                {isRide ? `Rider arrives in ~${trip.etaMin} min` : `Estimated arrival in ${trip.etaMin} min after pickup`}
                            </Text>
                        </View>
                    </View>
                ) : null}
            </ScrollView>

            {/* Sticky footer */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                    {trip ? (
                        <>
                            <Text style={styles.footPrice}>₹{trip.price}</Text>
                            <Text style={styles.footMeta} numberOfLines={1}>
                                <Bike size={11} color={colors.mutedForeground} />{'  '}
                                {trip.distanceKm.toFixed(1)} km · ~{trip.etaMin} min
                            </Text>
                        </>
                    ) : (
                        <>
                            <Text style={styles.footPrice}>—</Text>
                            <Text style={styles.footMeta} numberOfLines={1}>Set pickup & drop to see fare</Text>
                        </>
                    )}
                </View>
                <Button
                    label={isRide ? 'Confirm ride' : 'Confirm booking'}
                    loading={loading}
                    onPress={confirm}
                    style={styles.confirmBtn}
                />
            </View>

            <BottomSheet visible={sheet.visible} {...sheet.config} onClose={sheet.hide} />
        </View>
    );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
    return (
        <View style={styles.billRow}>
            <Text style={[styles.billLabel, bold && styles.billBold]} numberOfLines={1}>{label}</Text>
            <Text style={[styles.billValue, bold && styles.billBold]}>{value}</Text>
        </View>
    );
}

// Isolated so the useLiveRiders hook only fires when the map is on-screen.
function BookMapWithRiders({
    center, pickup, drop, onRoute,
}: { center: { lat: number; lng: number }; pickup?: any; drop?: any; onRoute: (r: any) => void }) {
    const liveRiders = useLiveRiders(center, 6);
    return (
        <LeafletMap
            center={center}
            pickup={pickup}
            drop={drop}
            onRoute={onRoute}
            liveRiders={liveRiders}
            style={{ height: 170 }}
        />
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    // Full-bleed map at the top
    mapWrap: { borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: '#f3f3f3' },

    section: { paddingHorizontal: 6, marginTop: 10 },
    label: { fontSize: 11, fontFamily: fonts.bodyBold, color: colors.mutedForeground, letterSpacing: 0.4, marginBottom: 6, textTransform: 'uppercase' },

    // Category / ride chip — icon perfectly centered in a fixed-height slot,
    // then a single line of text below. Consistent size regardless of icon.
    catChip: {
        alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: 12, paddingVertical: 8,
        minWidth: 82,
        borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
        backgroundColor: colors.card,
    },
    catChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    catIconSlot: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
    catChipEmoji: { fontSize: 14 },
    catChipLabel: { fontSize: 12, fontFamily: fonts.bodyBold, color: colors.foreground, marginTop: 4, textAlign: 'center' },
    catChipLabelActive: { color: colors.primaryForeground },

    mapHint: {
        position: 'absolute', bottom: 8, alignSelf: 'center',
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 6,
        borderRadius: radius.pill,
    },
    mapHintText: { color: colors.primaryForeground, fontSize: 11, fontFamily: fonts.bodyBold },

    tripCard: { padding: 10, borderRadius: radius.lg, backgroundColor: colors.primary },
    tripRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, paddingHorizontal: 2 },
    tripTextWrap: { flex: 1, minWidth: 0 },
    tripFieldLabel: { fontSize: 10, letterSpacing: 0.6, fontFamily: fonts.bodyBold, color: 'rgba(255,255,255,0.85)' },
    tripValue: { fontSize: 13, fontFamily: fonts.bodyBold, color: '#FFFFFF', marginTop: 2 },
    tripPlaceholder: { color: 'rgba(255,255,255,0.7)' },
    tripDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginLeft: 32, marginVertical: 2 },
    pinDot: { width: 28, height: 28, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.22)' },

    savedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
    savedChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 8, paddingVertical: 5, borderRadius: radius.md, backgroundColor: colors.card, maxWidth: '100%' },
    savedChipText: { fontSize: 11, fontFamily: fonts.bodyBold, color: colors.foreground, flexShrink: 1 },

    // Important fix: noteWrap was letting Input overflow the right edge. Now the Input
    // sits inside a flex:1, minWidth:0 wrapper so it never escapes the parent width.
    noteWrap: { flexDirection: 'row', alignItems: 'flex-start' },

    payRow: { flexDirection: 'row', gap: 6 },
    payBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.card },
    payBtnActive: { borderColor: colors.foreground, borderWidth: 2 },
    payText: { fontSize: 13, fontFamily: fonts.bodyBold, color: colors.foreground },

    bill: { borderWidth: 1, borderColor: colors.border, padding: 10, borderRadius: radius.md, backgroundColor: colors.card },
    billRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, gap: 8 },
    billLabel: { fontSize: 12, color: colors.mutedForeground, fontFamily: fonts.body, flex: 1, minWidth: 0 },
    billValue: { fontSize: 12, color: colors.foreground, fontFamily: fonts.bodyBold },
    billBold: { fontSize: 15, color: colors.foreground, fontFamily: fonts.displayBold },
    billDivider: { height: 1, backgroundColor: colors.divider, marginVertical: 4 },
    etaText: { fontSize: 11, color: colors.mutedForeground, fontFamily: fonts.body, marginTop: 4 },

    footer: {
        flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 6, paddingTop: 8,
        borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card,
    },
    footPrice: { fontSize: 18, fontFamily: fonts.displayBold, color: colors.foreground },
    footMeta: { fontSize: 11, color: colors.mutedForeground, fontFamily: fonts.body, marginTop: 2 },
    confirmBtn: { flex: 1.2 },
});
