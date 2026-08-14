import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Keyboard, Platform } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { ArrowLeft, Crosshair, SearchCheck } from 'lucide-react-native';
import { colors, fonts } from '@/lib/theme';
import LeafletMap, { LatLng } from '@/components/LeafletMap';
import Button from '@/components/Button';
import Input from '@/components/Input';
import BottomSheet from '@/components/BottomSheet';
import { useSheet } from '@/lib/useSheet';
import { useBooking } from '@/lib/bookingStore';
import { useSavedPlaces } from '@/lib/savedPlacesStore';

// Default city: New Delhi
const DEFAULT_CENTER: LatLng = { lat: 28.6139, lng: 77.209 };

function paramStr(v?: string | string[]): string {
    if (Array.isArray(v)) return String(v[0] || '');
    return v ? String(v) : '';
}

export default function SelectLocationScreen() {
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{
        field?: string | string[];
        slot?: string | string[];
        purpose?: string | string[];
        lat?: string | string[];
        lng?: string | string[];
        address?: string | string[];
    }>();
    const fieldStr = paramStr(params.field);
    const slotStr = paramStr(params.slot);
    const purposeStr = paramStr(params.purpose);
    const savingPlace = purposeStr === 'saved';
    // `slot` extends `field` to allow extra-pickup targets: pickup2 / pickup3 / pickup4.
    const targetSlot = slotStr || fieldStr || 'pickup';
    const which: 'pickup' | 'drop' = targetSlot === 'drop' ? 'drop' : 'pickup';
    const extraIndex = /^pickup(\d+)$/.exec(targetSlot)?.[1];
    const extraIdx = extraIndex ? Math.max(0, parseInt(extraIndex, 10) - 2) : -1; // pickup2 -> 0
    const sheet = useSheet();
    const setDraft = useBooking((s) => s.setDraft);
    const draft = useBooking((s) => s.draft);

    const extra = extraIdx >= 0 ? draft.extraPickups[extraIdx] : null;

    const paramLat = Number(paramStr(params.lat));
    const paramLng = Number(paramStr(params.lng));
    const paramCoord: LatLng | null =
        Number.isFinite(paramLat) && Number.isFinite(paramLng) ? { lat: paramLat, lng: paramLng } : null;
    const paramAddress = paramStr(params.address);

    // Route params (banner tap) win over draft so the map opens on the
    // intended pin. Pickup / extra pickup / drop never fall back onto each other.
    const seededCoord = extraIdx >= 0
        ? (paramCoord || extra?.coord || null)
        : which === 'drop'
            ? (paramCoord || draft.dropCoord)
            : (paramCoord || draft.pickupCoord);
    const seededAddress = extraIdx >= 0
        ? (paramAddress || extra?.address || '')
        : which === 'drop'
            ? (paramAddress || draft.drop)
            : (paramAddress || draft.pickup);

    const hasSavedCoord = !!seededCoord;
    const initial = seededCoord || DEFAULT_CENTER;
    const initialAddress = seededAddress;

    const [center, setCenter] = useState<LatLng>(initial);
    const [address, setAddress] = useState<string>(initialAddress);
    const [resolving, setResolving] = useState(false);
    const [locating, setLocating] = useState(!hasSavedCoord);
    const [confirming, setConfirming] = useState(false);
    const [kbHeight, setKbHeight] = useState(0);
    // Keep the seeded drop/banner address until the user actually pans the map.
    const skipReverseRef = useRef(!!initialAddress && hasSavedCoord);

    // Expo Router can hydrate `field`/`lat` after the first paint. Re-apply
    // the seeded pin so a banner tap never stays stuck on the wrong slot.
    useEffect(() => {
        if (savingPlace) return;
        if (seededCoord) {
            setCenter(seededCoord);
            setLocating(false);
            skipReverseRef.current = !!seededAddress;
        }
        if (seededAddress) setAddress(seededAddress);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [which, extraIdx, seededCoord?.lat, seededCoord?.lng, seededAddress]);

    // Track keyboard height so the bottom address card lifts above the keyboard
    // and the search input never gets hidden behind it.
    useEffect(() => {
        const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
        const s = Keyboard.addListener(showEvt, (e) => setKbHeight(e.endCoordinates?.height ?? 0));
        const h = Keyboard.addListener(hideEvt, () => setKbHeight(0));
        return () => { s.remove(); h.remove(); };
    }, []);


    // Auto-detect user's current location on first open when no saved coord exists.
    useEffect(() => {
        if (hasSavedCoord) return;
        let cancelled = false;
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    if (!cancelled) setLocating(false);
                    return;
                }
                const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                if (cancelled) return;
                setCenter({ lat: loc.coords.latitude, lng: loc.coords.longitude });
            } catch {
                // keep default center silently
            } finally {
                if (!cancelled) setLocating(false);
            }
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    // Reverse geocode the current map center (debounced).
    // Skip the first run when we already have the banner/drop address —
    // otherwise GPS reverse-geocode overwrites it with the pickup street.
    useEffect(() => {
        if (skipReverseRef.current) {
            skipReverseRef.current = false;
            setResolving(false);
            return;
        }
        let cancelled = false;
        setResolving(true);
        const t = setTimeout(async () => {
            try {
                const results = await Location.reverseGeocodeAsync({
                    latitude: center.lat,
                    longitude: center.lng,
                });
                if (cancelled) return;
                const r = results[0];
                if (r) {
                    const parts = [r.name, r.street, r.district, r.city, r.region]
                        .filter((p, i, arr) => p && arr.indexOf(p) === i);
                    setAddress(parts.join(', ') || `${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}`);
                }
            } catch {
                if (!cancelled) setAddress(`${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}`);
            } finally {
                if (!cancelled) setResolving(false);
            }
        }, 450);
        return () => { cancelled = true; clearTimeout(t); };
    }, [center.lat, center.lng]);

    const useMyLocation = async () => {
        setLocating(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                sheet.show({
                    variant: 'warning',
                    title: 'Location permission needed',
                    message: 'Please allow location access to detect where you are.',
                });
                return;
            }
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            setCenter({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        } catch {
            sheet.show({
                variant: 'error',
                title: 'Could not get location',
                message: 'Try again, or drag the map to set the spot manually.',
            });
        } finally {
            setLocating(false);
        }
    };

    const confirm = () => {
        if (!address.trim()) {
            sheet.show({ variant: 'error', title: 'Address required', message: 'Please pin a location on the map.' });
            return;
        }
        setConfirming(true);
        if (savingPlace) {
            useSavedPlaces.getState().setPendingPick({ address: address.trim(), coord: center });
        } else if (extraIdx >= 0) {
            const next = [...draft.extraPickups];
            next[extraIdx] = { address: address.trim(), coord: center };
            setDraft({ extraPickups: next });
        } else if (which === 'pickup') {
            setDraft({ pickup: address.trim(), pickupCoord: center });
        } else {
            setDraft({ drop: address.trim(), dropCoord: center });
        }
        setTimeout(() => {
            setConfirming(false);
            router.back();
        }, 250);
    };

    const accent = which === 'pickup' ? colors.accent : colors.foreground;

    return (
        <View style={styles.container}>
            {/* Map fills the screen.
                When placing the drop, keep the pickup marker visible (and vice-versa)
                so the user always sees the other end of the trip they're planning. */}
            <LeafletMap
                center={center}
                pickerMode
                pinColor={accent}
                pickup={which === 'drop' ? draft.pickupCoord || undefined : undefined}
                drop={which === 'pickup' ? draft.dropCoord || undefined : undefined}
                showTraffic={false}
                onCenterChange={setCenter}
                style={StyleSheet.absoluteFill}
            />

            {/* Top bar overlay */}
            <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
                <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
                    <ArrowLeft size={22} color={colors.foreground} />
                </Pressable>
                <View style={styles.titleWrap}>
                    <Text style={styles.titleSmall}>
                        {savingPlace
                            ? 'Set saved address'
                            : extraIdx >= 0
                                ? `Set pickup ${extraIdx + 2}`
                                : which === 'pickup' ? 'Set pickup location' : 'Set drop location'}
                    </Text>
                    <Text style={styles.titleHint}>Drag the map to move the pin</Text>
                </View>
                <View style={styles.backBtn} />
            </View>

            {/* My-location button (floats above bottom card) */}
            <Pressable
                onPress={useMyLocation}
                style={[styles.myLocBtn, { bottom: insets.bottom + 220 + kbHeight }]}
                hitSlop={6}
            >
                {locating
                    ? <ActivityIndicator color={colors.foreground} />
                    : <Crosshair size={18} color={colors.foreground} />}
            </Pressable>

            {/* Bottom address card */}
            <View style={[styles.bottomCard, { paddingBottom: insets.bottom + 10, bottom: kbHeight }]}>

                <View style={styles.handle} />
                <Text style={styles.label}>
                    {savingPlace
                        ? 'ADDRESS'
                        : extraIdx >= 0
                            ? `PICKUP ${extraIdx + 2} ADDRESS`
                            : which === 'pickup' ? 'PICKUP ADDRESS' : 'DROP ADDRESS'}
                </Text>
                <View style={styles.addrRow}>
                    <View style={[styles.pinDot, { backgroundColor: accent }]} />
                    <View style={{ flex: 1 }}>
                        <Input
                            placeholder="Search or edit address"
                            value={address}
                            onChangeText={setAddress}
                        />
                    </View>
                </View>
                {resolving ? (
                    <Text style={styles.resolving}>Finding address…</Text>
                ) : (
                    <Text style={styles.resolved} numberOfLines={1}>
                        <SearchCheck size={10} color={colors.mutedForeground} /> {center.lat.toFixed(4)}, {center.lng.toFixed(4)}
                    </Text>
                )}
                <Button
                    label={savingPlace ? 'Confirm address' : which === 'pickup' ? 'Confirm pickup' : 'Confirm drop'}
                    loading={confirming}
                    onPress={confirm}
                    style={{ marginTop: 8 }}
                />
            </View>

            <BottomSheet visible={sheet.visible} {...sheet.config} onClose={sheet.hide} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    topBar: {
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        paddingHorizontal: 6, paddingBottom: 8, flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.94)', borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    backBtn: {
        width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
        borderRadius: 999, backgroundColor: colors.card,
        shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
    },
    titleWrap: { flex: 1, alignItems: 'center' },
    titleSmall: { fontSize: 14, fontFamily: fonts.heading, color: colors.foreground },
    titleHint: { fontSize: 10, color: colors.mutedForeground, fontFamily: fonts.body, marginTop: 1 },

    myLocBtn: {
        position: 'absolute', right: 10, width: 42, height: 42,
        alignItems: 'center', justifyContent: 'center', borderRadius: 999,
        backgroundColor: colors.card, zIndex: 10,
        shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3,
    },

    bottomCard: {
        position: 'absolute', left: 0, right: 0, bottom: 0,
        backgroundColor: colors.card,
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        paddingHorizontal: 14, paddingTop: 10,
    },
    handle: { alignSelf: 'center', width: 44, height: 4, backgroundColor: colors.border, marginBottom: 10, borderRadius: 999 },
    label: { fontSize: 10, letterSpacing: 1.2, fontFamily: fonts.bodyBold, color: colors.mutedForeground, marginBottom: 6 },
    addrRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    pinDot: { width: 10, height: 10, borderRadius: 999 },
    resolving: { fontSize: 11, color: colors.mutedForeground, fontFamily: fonts.body, marginTop: 6 },
    resolved: { fontSize: 11, color: colors.mutedForeground, fontFamily: fonts.body, marginTop: 6 },
});
