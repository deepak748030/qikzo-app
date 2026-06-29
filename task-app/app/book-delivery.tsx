import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Banknote, Wallet, Phone, FileText, Bike, ChevronRight, MapPin, Home } from 'lucide-react-native';
import { colors, fonts, radius } from '@/lib/theme';
import ScreenHeader from '@/components/ScreenHeader';
import Input from '@/components/Input';
import Button from '@/components/Button';
import BottomSheet from '@/components/BottomSheet';
import LeafletMap from '@/components/LeafletMap';
import { useSheet } from '@/lib/useSheet';
import { categories, estimateTrip, savedPlaces } from '@/lib/mockData';
import { rideOptions, estimateRide } from '@/lib/serviceMode';
import { newBookingId, useBooking } from '@/lib/bookingStore';

export default function BookDeliveryScreen() {
    const insets = useSafeAreaInsets();
    const draft = useBooking((s) => s.draft);
    const setDraft = useBooking((s) => s.setDraft);
    const addBooking = useBooking((s) => s.addBooking);
    const resetDraft = useBooking((s) => s.resetDraft);
    const sheet = useSheet();
    const [loading, setLoading] = useState(false);

    const isRide = draft.mode === 'ride';

    const trip = useMemo(() => {
        if (!draft.pickup.trim() || !draft.drop.trim()) return null;
        const base = estimateTrip(draft.pickup, draft.drop);
        if (isRide) {
            const r = estimateRide(base.distanceKm, draft.categoryId);
            return { ...base, ...r };
        }
        return base;
    }, [draft.pickup, draft.drop, draft.categoryId, isRide]);

    const openMap = (field: 'pickup' | 'drop') => {
        router.push({ pathname: '/select-location', params: { field } });
    };

    const confirm = () => {
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
        }, 600);
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
                {/* Route map preview — full-bleed */}
                {(draft.pickupCoord || draft.dropCoord) ? (
                    <View style={styles.mapWrap}>
                        <LeafletMap
                            center={draft.pickupCoord || draft.dropCoord!}
                            pickup={draft.pickupCoord || undefined}
                            drop={draft.dropCoord || undefined}
                            style={{ height: 150 }}
                        />
                    </View>
                ) : null}

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
                                    <Text style={styles.catChipEmoji}>{item.emoji}</Text>
                                    <Text style={[styles.catChipLabel, active && styles.catChipLabelActive]}>{item.name}</Text>
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
                            <FileText size={14} color={colors.mutedForeground} style={{ marginTop: 10, marginRight: 4 }} />
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
                        <Phone size={14} color={colors.mutedForeground} style={{ marginTop: 12, marginRight: 4 }} />
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

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    // Full-bleed map at the top
    mapWrap: { borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: '#f3f3f3' },

    section: { paddingHorizontal: 6, marginTop: 10 },
    label: { fontSize: 11, fontFamily: fonts.bodyBold, color: colors.mutedForeground, letterSpacing: 0.4, marginBottom: 6, textTransform: 'uppercase' },

    catChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.card },
    catChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    catChipEmoji: { fontSize: 14 },
    catChipLabel: { fontSize: 12, fontFamily: fonts.bodyBold, color: colors.foreground },
    catChipLabelActive: { color: colors.primaryForeground },

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
