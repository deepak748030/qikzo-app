import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, FlatList, Switch, Image, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Banknote, Wallet, Bike, ChevronRight, MapPin, Home, UserPlus, Camera, ImagePlus, X, Plus, Mic, MicOff } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import {
    ExpoSpeechRecognitionModule,
    useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { colors, fonts, radius } from '@/lib/theme';
import ScreenHeader from '@/components/ScreenHeader';
import Input from '@/components/Input';
import Button from '@/components/Button';
import BottomSheet from '@/components/BottomSheet';
import PromoBanners from '@/components/PromoBanners';
import { useSheet } from '@/lib/useSheet';
import { categories, estimateTrip, savedPlaces } from '@/lib/mockData';
import AssetIcon from '@/components/AssetIcon';
import { rideOptions, estimateRide } from '@/lib/serviceMode';
import { newBookingId, useBooking } from '@/lib/bookingStore';
import { ApiError } from '@/lib/api/errors';
import { tokenStore } from '@/lib/api/tokenStore';
import { uploadFile } from '@/lib/api/endpoints/uploads';

export default function BookDeliveryScreen() {
    const insets = useSafeAreaInsets();
    const draft = useBooking((s) => s.draft);
    const setDraft = useBooking((s) => s.setDraft);
    const addBooking = useBooking((s) => s.addBooking);
    const createOnServer = useBooking((s) => s.createOnServer);
    const resetDraft = useBooking((s) => s.resetDraft);
    const sheet = useSheet();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [recording, setRecording] = useState(false);
    const notesBaseRef = useRef<string>('');

    const isRide = draft.mode === 'ride';

    const MAX_IMAGES = 4;
    const MAX_EXTRA_PICKUPS = 3;

    // Pick an image from the library OR the camera, upload it, and push the
    // returned absolute URL into the draft so it ships with the booking.
    const pickAndUpload = async (source: 'camera' | 'library') => {
        try {
            if ((draft.noteImages?.length || 0) >= MAX_IMAGES) {
                sheet.show({ variant: 'error', title: 'Limit reached', message: `You can add up to ${MAX_IMAGES} photos.` });
                return;
            }
            if (!tokenStore.get().accessToken) {
                sheet.show({ variant: 'error', title: 'Sign in required', message: 'Please sign in to attach photos.' });
                return;
            }
            let perm;
            if (source === 'camera') {
                perm = await ImagePicker.requestCameraPermissionsAsync();
            } else {
                perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
            }
            if (!perm.granted) {
                sheet.show({ variant: 'error', title: 'Permission needed', message: 'Please allow photo access to attach an image.' });
                return;
            }
            const res = source === 'camera'
                ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'] as any, quality: 0.7, allowsEditing: false })
                : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] as any, quality: 0.7, allowsEditing: false, allowsMultipleSelection: false });
            if (res.canceled || !res.assets?.[0]) return;
            const asset = res.assets[0];
            setUploading(true);
            const up = await uploadFile({
                localUri: asset.uri,
                name: asset.fileName || `item_${Date.now()}.jpg`,
                mimeType: asset.mimeType || 'image/jpeg',
            });
            setDraft({ noteImages: [...(draft.noteImages || []), up.absoluteUrl] });
        } catch (e) {
            const msg = e instanceof ApiError ? e.message : 'Could not upload photo. Please try again.';
            sheet.show({ variant: 'error', title: 'Upload failed', message: msg });
        } finally {
            setUploading(false);
        }
    };

    const removeImage = (url: string) => {
        setDraft({ noteImages: (draft.noteImages || []).filter((u) => u !== url) });
    };

    // Voice → text using the device's built-in speech recognizer
    // (iOS Speech framework / Android SpeechRecognizer). 100% on-device,
    // no server, no API key. Interim results stream into the notes field
    // and remain fully editable before submit.
    useSpeechRecognitionEvent('result', (e) => {
        const transcript = e.results?.[0]?.transcript ?? '';
        if (!transcript) return;
        const base = notesBaseRef.current;
        const combined = base ? `${base} ${transcript}` : transcript;
        setDraft({ notes: combined });
    });
    useSpeechRecognitionEvent('end', () => setRecording(false));
    useSpeechRecognitionEvent('error', (e) => {
        setRecording(false);
        const code = (e as any)?.error;
        if (code === 'no-speech' || code === 'aborted') return;
        sheet.show({
            variant: 'error',
            title: 'Voice input error',
            message: (e as any)?.message || 'Could not capture speech. Please try again.',
        });
    });

    useEffect(() => {
        return () => {
            try { ExpoSpeechRecognitionModule.stop(); } catch {}
        };
    }, []);

    const toggleRecording = async () => {
        try {
            if (recording) {
                ExpoSpeechRecognitionModule.stop();
                setRecording(false);
                return;
            }
            const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
            if (!perm.granted) {
                sheet.show({
                    variant: 'error',
                    title: 'Microphone needed',
                    message: 'Please allow microphone and speech recognition access to use voice input.',
                });
                return;
            }
            // Snapshot current notes so streamed interim/final transcripts
            // append to what the user already typed instead of overwriting it.
            notesBaseRef.current = (draft.notes || '').trim();
            ExpoSpeechRecognitionModule.start({
                lang: 'en-US',
                interimResults: true,
                continuous: true,
                requiresOnDeviceRecognition: false,
                addsPunctuation: true,
            });
            setRecording(true);
        } catch (e) {
            setRecording(false);
            sheet.show({ variant: 'error', title: 'Voice input error', message: 'Could not start voice input.' });
        }
    };

    // Multi-pickup mgmt (Pickup 2, 3, 4 — up to MAX_EXTRA_PICKUPS).
    const addExtraPickup = () => {
        if (draft.extraPickups.length >= MAX_EXTRA_PICKUPS) return;
        const next = [...draft.extraPickups, { address: '', coord: null }];
        setDraft({ extraPickups: next });
        router.push({ pathname: '/select-location', params: { slot: `pickup${next.length + 1}` } });
    };
    const editExtraPickup = (idx: number) => {
        router.push({ pathname: '/select-location', params: { slot: `pickup${idx + 2}` } });
    };
    const removeExtraPickup = (idx: number) => {
        setDraft({ extraPickups: draft.extraPickups.filter((_, i) => i !== idx) });
    };

    const trip = useMemo(() => {
        if (!draft.pickup.trim() || !draft.drop.trim()) return null;
        // Build the full leg list: Pickup → Pickup2 → ... → Drop.
        const stops = [draft.pickup, ...draft.extraPickups.map((s) => s.address).filter((a) => a.trim()), draft.drop];
        let distanceKm = 0;
        let etaMin = 0;
        let base = 0, perKm = 0;
        for (let i = 0; i < stops.length - 1; i++) {
            const leg = estimateTrip(stops[i], stops[i + 1]);
            distanceKm += leg.distanceKm;
            etaMin += leg.etaMin;
            base = leg.base;
            perKm = leg.perKm;
        }
        const price = Math.round(base + distanceKm * perKm);
        const baseTrip = { distanceKm, etaMin, price, base, perKm };
        if (isRide) {
            const r = estimateRide(distanceKm, draft.categoryId);
            return { ...baseTrip, ...r };
        }
        return baseTrip;
    }, [draft.pickup, draft.drop, draft.extraPickups, draft.categoryId, isRide]);

    const openMap = (field: 'pickup' | 'drop') => {
        router.push({ pathname: '/select-location', params: { field } });
    };

    const confirm = async () => {
        // Double-tap guard — the button already shows a spinner, but on
        // Android a fast second tap can fire before the disabled state paints.
        if (loading) return;
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
                    extraPickups: draft.extraPickups
                        .filter((s) => s.address.trim())
                        .map((s) => ({
                            address: s.address.trim(),
                            lat: s.coord?.lat ?? null,
                            lng: s.coord?.lng ?? null,
                        })),
                    drop: {
                        address: draft.drop.trim(),
                        lat: draft.dropCoord?.lat ?? null,
                        lng: draft.dropCoord?.lng ?? null,
                    },
                    notes: draft.notes.trim() || (isRide ? 'Passenger ride' : ''),
                    noteImages: isRide ? undefined : (draft.noteImages || []),
                    recipientPhone: draft.recipientPhone.trim() || undefined,
                    recipientName: draft.bookingForOther ? (draft.recipientName.trim() || undefined) : undefined,
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
                {/* Promo banners at the top — same auto-scrolling carousel as the
                    home screen, filtered by the currently selected category and by
                    the user's pickup/drop location so only relevant, nearby offers
                    show. Replaces the previous route-preview map. */}
                <View style={styles.bannerWrap}>
                    <PromoBanners
                        userCoord={draft.pickupCoord || draft.dropCoord || null}
                        categorySlug={draft.categoryId}
                        topGap={0}
                    />

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

                        {/* Extra pickup stops (Pickup 2, 3, 4) — only for deliveries. */}
                        {!isRide && draft.extraPickups.map((s, idx) => (
                            <View key={idx}>
                                <View style={styles.tripDivider} />
                                <Pressable style={styles.tripRow} onPress={() => editExtraPickup(idx)}>
                                    <View style={styles.pinDot}>
                                        <MapPin size={14} color="#FFFFFF" />
                                    </View>
                                    <View style={styles.tripTextWrap}>
                                        <Text style={styles.tripFieldLabel}>Pick up {idx + 2}</Text>
                                        <Text
                                            style={[styles.tripValue, !s.address && styles.tripPlaceholder]}
                                            numberOfLines={2}
                                        >
                                            {s.address || 'Tap to set on the map'}
                                        </Text>
                                    </View>
                                    <Pressable onPress={() => removeExtraPickup(idx)} hitSlop={10} style={styles.tripRemoveBtn}>
                                        <X size={14} color="#FFFFFF" />
                                    </Pressable>
                                </Pressable>
                            </View>
                        ))}

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

                    {/* Add another pickup — deliveries only. */}
                    {!isRide && draft.extraPickups.length < MAX_EXTRA_PICKUPS ? (
                        <Pressable style={styles.addPickupBtn} onPress={addExtraPickup}>
                            <Plus size={14} color={colors.foreground} />
                            <Text style={styles.addPickupText}>Add another pickup</Text>
                        </Pressable>
                    ) : null}

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

                {/* Notes + photo attachments — only for deliveries */}
                {!isRide ? (
                    <View style={styles.section}>
                        <View style={styles.noteHeader}>
                            <Text style={[styles.label, { marginBottom: 0 }]}>What needs to be picked up?</Text>
                            <Pressable
                                onPress={toggleRecording}
                                style={[styles.micBtn, recording && styles.micBtnActive]}
                                hitSlop={6}
                            >
                                {recording ? (
                                    <>
                                        <MicOff size={14} color="#FFFFFF" />
                                        <Text style={styles.micTextActive}>Stop</Text>
                                    </>
                                ) : (
                                    <>
                                        <Mic size={14} color={colors.foreground} />
                                        <Text style={styles.micText}>Voice</Text>
                                    </>
                                )}
                            </Pressable>
                        </View>
                        <View style={styles.noteWrap}>
                            <View style={{ flex: 1, minWidth: 0 }}>
                                <Input
                                    placeholder={'List the items, sizes, brand notes... or tap Voice to dictate\ne.g. 2L Amul milk, brown bread, 6 eggs'}
                                    value={draft.notes}
                                    onChangeText={(v) => setDraft({ notes: v })}
                                    multiline
                                    numberOfLines={4}
                                    style={{ minHeight: 70, textAlignVertical: 'top' }}
                                />
                            </View>
                        </View>

                        {/* Photo attachments — up to MAX_IMAGES thumbs + add button.
                            Helps riders identify exact items (brand, pack size). */}
                        <View style={styles.photoRow}>
                            {(draft.noteImages || []).map((url) => (
                                <View key={url} style={styles.photoThumb}>
                                    <Image source={{ uri: url }} style={styles.photoImg} />
                                    <Pressable style={styles.photoRemove} onPress={() => removeImage(url)} hitSlop={6}>
                                        <X size={12} color="#FFFFFF" />
                                    </Pressable>
                                </View>
                            ))}
                            {(draft.noteImages?.length || 0) < MAX_IMAGES ? (
                                <View style={styles.photoActions}>
                                    <Pressable
                                        style={styles.photoAddBtn}
                                        onPress={() => pickAndUpload('library')}
                                        disabled={uploading}
                                    >
                                        {uploading ? (
                                            <ActivityIndicator size="small" color={colors.mutedForeground} />
                                        ) : (
                                            <>
                                                <ImagePlus size={18} color={colors.mutedForeground} />
                                                <Text style={styles.photoAddText}>Add photo</Text>
                                            </>
                                        )}
                                    </Pressable>
                                    <Pressable
                                        style={styles.photoAddBtn}
                                        onPress={() => pickAndUpload('camera')}
                                        disabled={uploading}
                                    >
                                        <Camera size={18} color={colors.mutedForeground} />
                                        <Text style={styles.photoAddText}>Camera</Text>
                                    </Pressable>
                                </View>
                            ) : null}
                        </View>
                        <Text style={styles.photoHint}>Optional · up to {MAX_IMAGES} photos helps the rider find the exact item.</Text>
                    </View>
                ) : null}

                {/* Recipient contact — visible by default (same as before). A small
                    inline "Book for someone else" toggle sits in the header; when
                    switched on, we also collect the recipient/passenger name. */}
                <View style={styles.section}>
                    <View style={styles.recipientHeader}>
                        <Text style={[styles.label, { marginBottom: 0 }]}>
                            {isRide ? 'Co-passenger contact (optional)' : 'Recipient contact (optional)'}
                        </Text>
                        <View style={styles.otherToggle}>
                            <UserPlus size={14} color={colors.mutedForeground} />
                            <Text style={styles.otherToggleText}>Book for someone else</Text>
                            <Switch
                                value={draft.bookingForOther}
                                onValueChange={(v) => setDraft({ bookingForOther: v })}
                                trackColor={{ true: colors.primary, false: colors.border }}
                                thumbColor={'#FFFFFF'}
                                style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
                            />
                        </View>
                    </View>

                    {draft.bookingForOther ? (
                        <View style={{ marginBottom: 8 }}>
                            <Input
                                placeholder={isRide ? 'Passenger name' : 'Recipient name'}
                                value={draft.recipientName}
                                onChangeText={(v) => setDraft({ recipientName: v })}
                                maxLength={80}
                            />
                        </View>
                    ) : null}

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

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    // Full-bleed banner carousel at the top (replaces the old route map).
    bannerWrap: { borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card },

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

    // Recipient section header with an inline "Book for someone else" toggle.
    recipientHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 6, gap: 8,
    },
    otherToggle: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    otherToggleText: { fontSize: 11, fontFamily: fonts.bodyBold, color: colors.mutedForeground },

    // Photo attachment tiles under the notes field.
    photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    photoActions: { flexDirection: 'row', gap: 8 },
    photoThumb: {
        width: 68, height: 68, borderRadius: radius.md, overflow: 'hidden',
        borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card,
    },
    photoImg: { width: '100%', height: '100%' },
    photoRemove: {
        position: 'absolute', top: 2, right: 2, width: 18, height: 18,
        borderRadius: 9, backgroundColor: 'rgba(0,0,0,0.65)',
        alignItems: 'center', justifyContent: 'center',
    },
    photoAddBtn: {
        width: 68, height: 68, borderRadius: radius.md,
        borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed',
        alignItems: 'center', justifyContent: 'center', gap: 2,
        backgroundColor: colors.card,
    },
    photoAddText: { fontSize: 10, fontFamily: fonts.bodyBold, color: colors.mutedForeground },
    photoHint: { fontSize: 10, color: colors.mutedForeground, fontFamily: fonts.body, marginTop: 6 },

    tripCard: { padding: 10, borderRadius: radius.lg, backgroundColor: colors.primary },
    tripRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, paddingHorizontal: 2 },
    tripTextWrap: { flex: 1, minWidth: 0 },
    tripFieldLabel: { fontSize: 10, letterSpacing: 0.6, fontFamily: fonts.bodyBold, color: 'rgba(255,255,255,0.85)' },
    tripValue: { fontSize: 13, fontFamily: fonts.bodyBold, color: '#FFFFFF', marginTop: 2 },
    tripPlaceholder: { color: 'rgba(255,255,255,0.7)' },
    tripDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginLeft: 32, marginVertical: 2 },
    pinDot: { width: 28, height: 28, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.22)' },
    tripRemoveBtn: {
        width: 26, height: 26, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.22)',
    },
    addPickupBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        marginTop: 8, paddingVertical: 9, borderWidth: 1, borderColor: colors.border,
        borderStyle: 'dashed', borderRadius: radius.md, backgroundColor: colors.card,
    },
    addPickupText: { fontSize: 12, fontFamily: fonts.bodyBold, color: colors.foreground },

    // Notes header with an inline "Voice" mic button.
    noteHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, gap: 8 },
    micBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6,
        borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card,
    },
    micBtnActive: { backgroundColor: colors.danger, borderColor: colors.danger },
    micText: { fontSize: 11, fontFamily: fonts.bodyBold, color: colors.foreground },
    micTextActive: { fontSize: 11, fontFamily: fonts.bodyBold, color: '#FFFFFF' },

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
