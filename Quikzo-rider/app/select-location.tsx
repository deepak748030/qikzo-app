import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
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

// Default city: New Delhi
const DEFAULT_CENTER: LatLng = { lat: 28.6139, lng: 77.209 };

export default function SelectLocationScreen() {
    const insets = useSafeAreaInsets();
    const { field } = useLocalSearchParams<{ field?: 'pickup' | 'drop' }>();
    const which = field === 'drop' ? 'drop' : 'pickup';
    const sheet = useSheet();
    const setDraft = useBooking((s) => s.setDraft);
    const draft = useBooking((s) => s.draft);

    const hasSavedCoord =
        which === 'pickup' ? !!draft.pickupCoord : !!(draft.dropCoord || draft.pickupCoord);

    const initial =
        which === 'pickup'
            ? draft.pickupCoord || DEFAULT_CENTER
            : draft.dropCoord || draft.pickupCoord || DEFAULT_CENTER;

    const [center, setCenter] = useState<LatLng>(initial);
    const [address, setAddress] = useState<string>(
        which === 'pickup' ? draft.pickup : draft.drop
    );
    const [resolving, setResolving] = useState(false);
    const [locating, setLocating] = useState(!hasSavedCoord);
    const [confirming, setConfirming] = useState(false);

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
    useEffect(() => {
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
        if (which === 'pickup') {
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
                        {which === 'pickup' ? 'Set pickup location' : 'Set drop location'}
                    </Text>
                    <Text style={styles.titleHint}>Drag the map to move the pin</Text>
                </View>
                <View style={styles.backBtn} />
            </View>

            {/* My-location button (floats above bottom card) */}
            <Pressable
                onPress={useMyLocation}
                style={[styles.myLocBtn, { bottom: insets.bottom + 220 }]}
                hitSlop={6}
            >
                {locating
                    ? <ActivityIndicator color={colors.foreground} />
                    : <Crosshair size={18} color={colors.foreground} />}
            </Pressable>

            {/* Bottom address card */}
            <View style={[styles.bottomCard, { paddingBottom: insets.bottom + 10 }]}>
                <View style={styles.handle} />
                <Text style={styles.label}>
                    {which === 'pickup' ? 'PICKUP ADDRESS' : 'DROP ADDRESS'}
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
                    label={which === 'pickup' ? 'Confirm pickup' : 'Confirm drop'}
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
