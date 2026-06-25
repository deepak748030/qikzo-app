import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Banknote, Wallet, Phone, FileText, Bike } from 'lucide-react-native';
import { colors, fonts } from '@/lib/theme';
import ScreenHeader from '@/components/ScreenHeader';
import Input from '@/components/Input';
import Button from '@/components/Button';
import BottomSheet from '@/components/BottomSheet';
import { useSheet } from '@/lib/useSheet';
import { categories, estimateTrip, savedPlaces } from '@/lib/mockData';
import { newBookingId, useBooking } from '@/lib/bookingStore';

export default function BookDeliveryScreen() {
    const insets = useSafeAreaInsets();
    const draft = useBooking((s) => s.draft);
    const setDraft = useBooking((s) => s.setDraft);
    const addBooking = useBooking((s) => s.addBooking);
    const resetDraft = useBooking((s) => s.resetDraft);
    const sheet = useSheet();
    const [loading, setLoading] = useState(false);

    const trip = useMemo(() => {
        if (!draft.pickup.trim() || !draft.drop.trim()) return null;
        return estimateTrip(draft.pickup, draft.drop);
    }, [draft.pickup, draft.drop]);

    const confirm = () => {
        if (!draft.pickup.trim() || !draft.drop.trim()) {
            sheet.show({ variant: 'error', title: 'Locations required', message: 'Please set both pickup and drop locations.' });
            return;
        }
        if (!draft.notes.trim()) {
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
            notes: draft.notes.trim(),
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

    return (
        <View style={styles.container}>
            <ScreenHeader title="Book a delivery" />
            <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 140 }}
            >
                {/* Category chips */}
                <View style={styles.section}>
                    <Text style={styles.label}>What are you sending?</Text>
                    <FlatList
                        horizontal
                        data={categories}
                        keyExtractor={(c) => c.id}
                        showsHorizontalScrollIndicator={false}
                        ItemSeparatorComponent={() => <View style={{ width: 6 }} />}
                        contentContainerStyle={{ paddingHorizontal: 6 }}
                        renderItem={({ item }) => {
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

                {/* Locations */}
                <View style={styles.section}>
                    <Text style={styles.label}>Trip</Text>
                    <View style={styles.tripCard}>
                        <View style={styles.tripRow}>
                            <View style={[styles.pinDot, { backgroundColor: colors.accent }]} />
                            <Input
                                placeholder="Pickup location"
                                value={draft.pickup}
                                onChangeText={(v) => setDraft({ pickup: v })}
                            />
                        </View>
                        <View style={styles.tripDivider} />
                        <View style={styles.tripRow}>
                            <View style={[styles.pinDot, { backgroundColor: colors.foreground }]} />
                            <Input
                                placeholder="Drop location"
                                value={draft.drop}
                                onChangeText={(v) => setDraft({ drop: v })}
                            />
                        </View>
                    </View>

                    {/* Saved places shortcut */}
                    <View style={styles.savedRow}>
                        {savedPlaces.map((p) => (
                            <Pressable
                                key={p.id}
                                style={styles.savedChip}
                                onPress={() => setDraft({ drop: p.address })}
                            >
                                <Text style={{ fontSize: 12 }}>{p.emoji}</Text>
                                <Text style={styles.savedChipText}>Drop at {p.label}</Text>
                            </Pressable>
                        ))}
                    </View>
                </View>

                {/* Items / notes */}
                <View style={styles.section}>
                    <Text style={styles.label}>What needs to be picked up?</Text>
                    <View style={styles.noteWrap}>
                        <FileText size={14} color={colors.mutedForeground} style={{ marginTop: 8 }} />
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

                {/* Recipient phone */}
                <View style={styles.section}>
                    <Text style={styles.label}>Recipient contact (optional)</Text>
                    <View style={styles.noteWrap}>
                        <Phone size={14} color={colors.mutedForeground} style={{ marginTop: 10 }} />
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
                            <Row label={`Distance · ${trip.distanceKm.toFixed(1)} km × ₹${trip.perKm}`} value={`₹${Math.round(trip.distanceKm * trip.perKm)}`} />
                            <View style={styles.billDivider} />
                            <Row label="Total" value={`₹${trip.price}`} bold />
                            <Text style={styles.etaText}>Estimated arrival in {trip.etaMin} min after pickup</Text>
                        </View>
                    </View>
                ) : null}
            </ScrollView>

            {/* Sticky footer */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}>
                <View style={{ flex: 1 }}>
                    {trip ? (
                        <>
                            <Text style={styles.footPrice}>₹{trip.price}</Text>
                            <Text style={styles.footMeta}>
                                <Bike size={11} color={colors.mutedForeground} />{'  '}
                                {trip.distanceKm.toFixed(1)} km · ~{trip.etaMin} min
                            </Text>
                        </>
                    ) : (
                        <>
                            <Text style={styles.footPrice}>—</Text>
                            <Text style={styles.footMeta}>Enter pickup & drop to see fare</Text>
                        </>
                    )}
                </View>
                <Button label="Confirm booking" loading={loading} onPress={confirm} style={styles.confirmBtn} />
            </View>

            <BottomSheet visible={sheet.visible} {...sheet.config} onClose={sheet.hide} />
        </View>
    );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
    return (
        <View style={styles.billRow}>
            <Text style={[styles.billLabel, bold && styles.billBold]}>{label}</Text>
            <Text style={[styles.billValue, bold && styles.billBold]}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    section: { paddingHorizontal: 6, marginTop: 10 },
    label: { fontSize: 11, fontFamily: fonts.bodyBold, color: colors.mutedForeground, letterSpacing: 0.4, marginBottom: 6, textTransform: 'uppercase' },

    catChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: colors.border, borderRadius: 0, backgroundColor: colors.card },
    catChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    catChipEmoji: { fontSize: 14 },
    catChipLabel: { fontSize: 12, fontFamily: fonts.bodyBold, color: colors.foreground },
    catChipLabelActive: { color: colors.primaryForeground },

    tripCard: { borderWidth: 1, borderColor: colors.foreground, padding: 6, borderRadius: 0, backgroundColor: colors.card },
    tripRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    tripDivider: { height: 1, backgroundColor: colors.divider, marginLeft: 20, marginVertical: 4 },
    pinDot: { width: 10, height: 10, marginLeft: 2 },

    savedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
    savedChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 0, backgroundColor: colors.card },
    savedChipText: { fontSize: 11, fontFamily: fonts.bodyBold, color: colors.foreground },

    noteWrap: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },

    payRow: { flexDirection: 'row', gap: 6 },
    payBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderWidth: 1, borderColor: colors.border, borderRadius: 0, backgroundColor: colors.card },
    payBtnActive: { borderColor: colors.foreground, borderWidth: 2 },
    payText: { fontSize: 13, fontFamily: fonts.bodyBold, color: colors.foreground },

    bill: { borderWidth: 1, borderColor: colors.border, padding: 10, borderRadius: 0, backgroundColor: colors.card },
    billRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
    billLabel: { fontSize: 12, color: colors.mutedForeground, fontFamily: fonts.body, flex: 1 },
    billValue: { fontSize: 12, color: colors.foreground, fontFamily: fonts.bodyBold },
    billBold: { fontSize: 15, color: colors.foreground, fontFamily: fonts.displayBold },
    billDivider: { height: 1, backgroundColor: colors.divider, marginVertical: 4 },
    etaText: { fontSize: 11, color: colors.mutedForeground, fontFamily: fonts.body, marginTop: 4 },

    footer: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card },
    footPrice: { fontSize: 18, fontFamily: fonts.displayBold, color: colors.foreground },
    footMeta: { fontSize: 11, color: colors.mutedForeground, fontFamily: fonts.body, marginTop: 2 },
    confirmBtn: { flex: 1.2 },
});
