import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MapPin, Plus, Trash2, Pencil } from 'lucide-react-native';
import { colors, fonts, radius } from '@/lib/theme';
import ScreenHeader from '@/components/ScreenHeader';
import Input from '@/components/Input';
import Button from '@/components/Button';
import BottomSheet from '@/components/BottomSheet';
import Skeleton from '@/components/Skeleton';
import { useSheet } from '@/lib/useSheet';
import { tokenStore } from '@/lib/api/tokenStore';
import { ApiError } from '@/lib/api/errors';
import { useSavedPlaces, type UiPlace } from '@/lib/savedPlacesStore';

const PRESETS = [
    { label: 'Home', emoji: '🏠' },
    { label: 'Office', emoji: '🏢' },
    { label: 'Other', emoji: '📍' },
] as const;

export default function AddressesScreen() {
    const insets = useSafeAreaInsets();
    const sheet = useSheet();
    const places = useSavedPlaces((s) => s.places);
    const loading = useSavedPlaces((s) => s.loading);
    const loaded = useSavedPlaces((s) => s.loaded);

    const [formOpen, setFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [preset, setPreset] = useState<(typeof PRESETS)[number]['label']>('Home');
    const [customLabel, setCustomLabel] = useState('');
    const [address, setAddress] = useState('');
    const [coord, setCoord] = useState<{ lat: number; lng: number } | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        useSavedPlaces.getState().hydrate();
    }, []);

    useFocusEffect(useCallback(() => {
        const pick = useSavedPlaces.getState().consumePendingPick();
        if (pick) {
            setAddress(pick.address);
            setCoord(pick.coord);
            setFormOpen(true);
        }
    }, []));

    const resetForm = () => {
        setFormOpen(false);
        setEditingId(null);
        setPreset('Home');
        setCustomLabel('');
        setAddress('');
        setCoord(null);
    };

    const openAdd = () => {
        if (!tokenStore.get().accessToken) {
            sheet.show({ variant: 'error', title: 'Sign in required', message: 'Please sign in to save addresses.' });
            return;
        }
        setEditingId(null);
        setPreset('Home');
        setCustomLabel('');
        setAddress('');
        setCoord(null);
        setFormOpen(true);
    };

    const openEdit = (p: UiPlace) => {
        const match = PRESETS.find((x) => x.label.toLowerCase() === p.label.toLowerCase());
        setEditingId(p.id);
        setPreset(match ? match.label : 'Other');
        setCustomLabel(match ? '' : p.label);
        setAddress(p.address);
        setCoord(p.coord);
        setFormOpen(true);
    };

    const resolvedLabel = preset === 'Other' ? customLabel.trim() : preset;
    const resolvedEmoji = (PRESETS.find((x) => x.label === preset) || PRESETS[2]).emoji;

    const save = async () => {
        if (!resolvedLabel) {
            sheet.show({ variant: 'error', title: 'Label required', message: 'Give this place a name — Home, Office, or your own.' });
            return;
        }
        if (!address.trim()) {
            sheet.show({ variant: 'error', title: 'Address required', message: 'Type the address or pick it on the map.' });
            return;
        }
        setSaving(true);
        try {
            const payload = {
                label: resolvedLabel,
                address: address.trim(),
                emoji: resolvedEmoji,
                coord,
            };
            if (editingId) await useSavedPlaces.getState().update(editingId, payload);
            else await useSavedPlaces.getState().add(payload);
            resetForm();
            sheet.show({ variant: 'success', title: 'Saved', message: 'Address saved to your profile.' });
        } catch (e) {
            const msg = e instanceof ApiError ? e.message : 'Could not save address. Please try again.';
            sheet.show({ variant: 'error', title: 'Save failed', message: msg });
        } finally {
            setSaving(false);
        }
    };

    const confirmRemove = (p: UiPlace) => {
        sheet.show({
            variant: 'warning',
            title: `Delete ${p.label}?`,
            message: p.address,
            confirmText: 'Delete',
            cancelText: 'Keep',
            onConfirm: async () => {
                try {
                    await useSavedPlaces.getState().remove(p.id);
                    sheet.hide();
                } catch (e) {
                    const msg = e instanceof ApiError ? e.message : 'Could not delete address.';
                    sheet.show({ variant: 'error', title: 'Delete failed', message: msg });
                }
            },
        });
    };

    const pickOnMap = () => {
        router.push({ pathname: '/select-location', params: { purpose: 'saved' } });
    };

    return (
        <View style={styles.container}>
            <ScreenHeader title="Saved addresses" />
            {!loaded && loading ? (
                <View style={{ padding: 6, gap: 8 }}>
                    {[0, 1, 2].map((i) => (
                        <Skeleton key={i} width="100%" height={64} rounded="sm" />
                    ))}
                </View>
            ) : (
                <ScrollView
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ padding: 6, paddingBottom: insets.bottom + 24 }}
                >
                    {formOpen ? (
                        <View style={styles.form}>
                            <Text style={styles.label}>Label</Text>
                            <View style={styles.presetRow}>
                                {PRESETS.map((p) => {
                                    const active = preset === p.label;
                                    return (
                                        <Pressable
                                            key={p.label}
                                            style={[styles.presetChip, active && styles.presetChipActive]}
                                            onPress={() => setPreset(p.label)}
                                        >
                                            <Text style={{ fontSize: 13 }}>{p.emoji}</Text>
                                            <Text style={[styles.presetText, active && styles.presetTextActive]}>{p.label}</Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                            {preset === 'Other' ? (
                                <View style={{ marginTop: 6 }}>
                                    <Input label="Name" placeholder="e.g. Gym, Mom's place" value={customLabel} onChangeText={setCustomLabel} />
                                </View>
                            ) : null}

                            <View style={{ marginTop: 10 }}>
                                <Input
                                    label="Address"
                                    placeholder="House / street / area"
                                    value={address}
                                    onChangeText={setAddress}
                                    multiline
                                />
                            </View>

                            <Pressable style={styles.mapBtn} onPress={pickOnMap}>
                                <MapPin size={14} color={colors.foreground} />
                                <Text style={styles.mapBtnText}>{coord ? 'Change on map' : 'Pick on map'}</Text>
                            </Pressable>
                            {coord ? (
                                <Text style={styles.coordHint}>
                                    Pinned · {coord.lat.toFixed(4)}, {coord.lng.toFixed(4)}
                                </Text>
                            ) : null}

                            <Button label={editingId ? 'Update address' : 'Save address'} loading={saving} onPress={save} style={{ marginTop: 10 }} />
                            <Pressable style={styles.cancelBtn} onPress={resetForm}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </Pressable>
                        </View>
                    ) : (
                        <>
                            {places.length === 0 ? (
                                <View style={styles.empty}>
                                    <Text style={styles.emptyTitle}>No saved addresses</Text>
                                    <Text style={styles.emptySub}>Add Home, Office or any place you use often. They show up when you book a ride or delivery.</Text>
                                </View>
                            ) : (
                                <View style={styles.list}>
                                    {places.map((p, i) => (
                                        <View key={p.id} style={[styles.row, i === places.length - 1 && { borderBottomWidth: 0 }]}>
                                            <Pressable style={styles.rowMain} onPress={() => openEdit(p)}>
                                                <View style={styles.emojiWrap}>
                                                    <Text style={{ fontSize: 16 }}>{p.emoji}</Text>
                                                </View>
                                                <View style={{ flex: 1, minWidth: 0 }}>
                                                    <Text style={styles.rowLabel}>{p.label}</Text>
                                                    <Text style={styles.rowAddr} numberOfLines={2}>{p.address}</Text>
                                                </View>
                                                <Pencil size={14} color={colors.mutedForeground} />
                                            </Pressable>
                                            <Pressable onPress={() => confirmRemove(p)} hitSlop={8} style={styles.trashBtn}>
                                                <Trash2 size={16} color={colors.danger} />
                                            </Pressable>
                                        </View>
                                    ))}
                                </View>
                            )}

                            <Pressable style={styles.addBtn} onPress={openAdd}>
                                <Plus size={14} color={colors.foreground} />
                                <Text style={styles.addBtnText}>Add address</Text>
                            </Pressable>
                        </>
                    )}
                </ScrollView>
            )}
            <BottomSheet visible={sheet.visible} {...sheet.config} onClose={sheet.hide} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    label: {
        fontSize: 11, fontFamily: fonts.bodyBold, color: colors.mutedForeground,
        letterSpacing: 0.4, marginBottom: 6, textTransform: 'uppercase',
    },
    form: {
        borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
        backgroundColor: colors.card, padding: 10,
    },
    presetRow: { flexDirection: 'row', gap: 6 },
    presetChip: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        paddingVertical: 9, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
        backgroundColor: colors.card,
    },
    presetChipActive: { borderColor: colors.foreground, borderWidth: 2 },
    presetText: { fontSize: 13, fontFamily: fonts.bodyBold, color: colors.foreground },
    presetTextActive: { color: colors.foreground },
    mapBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        marginTop: 8, paddingVertical: 9, borderWidth: 1, borderColor: colors.border,
        borderStyle: 'dashed', borderRadius: radius.md, backgroundColor: colors.card,
    },
    mapBtnText: { fontSize: 12, fontFamily: fonts.bodyBold, color: colors.foreground },
    coordHint: { fontSize: 11, fontFamily: fonts.body, color: colors.mutedForeground, marginTop: 6 },
    cancelBtn: { alignItems: 'center', paddingVertical: 12 },
    cancelText: { fontSize: 13, fontFamily: fonts.bodyBold, color: colors.mutedForeground },

    list: {
        borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
        backgroundColor: colors.card, overflow: 'hidden',
    },
    row: {
        flexDirection: 'row', alignItems: 'center',
        borderBottomWidth: 1, borderBottomColor: colors.divider, paddingRight: 4,
    },
    rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 10 },
    emojiWrap: {
        width: 36, height: 36, borderRadius: radius.sm, backgroundColor: colors.chipBg,
        alignItems: 'center', justifyContent: 'center',
    },
    rowLabel: { fontSize: 14, fontFamily: fonts.bodyBold, color: colors.foreground },
    rowAddr: { fontSize: 12, fontFamily: fonts.body, color: colors.mutedForeground, marginTop: 2 },
    trashBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

    empty: {
        borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
        backgroundColor: colors.card, padding: 16,
    },
    emptyTitle: { fontSize: 14, fontFamily: fonts.displayBold, color: colors.foreground },
    emptySub: { fontSize: 12, fontFamily: fonts.body, color: colors.mutedForeground, marginTop: 6, lineHeight: 18 },

    addBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        marginTop: 8, paddingVertical: 12, borderWidth: 1, borderColor: colors.border,
        borderStyle: 'dashed', borderRadius: radius.md, backgroundColor: colors.card,
    },
    addBtnText: { fontSize: 13, fontFamily: fonts.bodyBold, color: colors.foreground },
});
