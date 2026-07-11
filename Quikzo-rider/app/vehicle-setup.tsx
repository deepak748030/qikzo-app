import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { MapPin, Check } from 'lucide-react-native';

const VEHICLE_IMAGES: Record<VehicleType, any> = {
    bike: require('../assets/icons/bike.png'),
    auto: require('../assets/icons/auto.png'),
    sedan: require('../assets/icons/sedan.png'),
};
import { colors, fonts, radius } from '@/lib/theme';
import ScreenHeader from '@/components/ScreenHeader';
import Input from '@/components/Input';
import Button from '@/components/Button';
import BottomSheet from '@/components/BottomSheet';
import { useSheet } from '@/lib/useSheet';
import { useAuth, VehicleType } from '@/lib/authStore';

// Post-OTP setup: pick vehicle, register the number plate, enable location.
const OPTIONS: { key: VehicleType; label: string; sub: string }[] = [
    { key: 'bike', label: 'Two-wheeler', sub: 'Bike / scooter for parcels, food, groceries' },
    { key: 'auto', label: 'Auto rickshaw', sub: 'Three-wheeler for rides and small cargo' },
    { key: 'sedan', label: 'Sedan', sub: 'Four-wheeler for rides and premium delivery' },
];

// Loose Indian plate pattern: 2 letters + 1-2 digits + 1-3 letters + 4 digits.
const PLATE_RE = /^[A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,3}\s?\d{4}$/;

export default function VehicleSetup() {
    const insets = useSafeAreaInsets();
    const sheet = useSheet();
    const setVehicleProfile = useAuth((s) => s.setVehicleProfile);
    const setLocationGranted = useAuth((s) => s.setLocationGranted);
    const locationGranted = useAuth((s) => s.locationGranted);

    const [type, setType] = useState<VehicleType>('bike');
    const [plate, setPlate] = useState('');
    const [loading, setLoading] = useState(false);

    const requestLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                setLocationGranted(true);
                sheet.show({ variant: 'success', title: 'Location enabled', message: "We'll only use it while you're online to match nearby jobs." });
            } else {
                sheet.show({ variant: 'warning', title: 'Location required', message: 'Enable location from Settings so we can send you jobs near you.' });
            }
        } catch {
            // Web / unsupported — mock the grant so the flow continues.
            setLocationGranted(true);
        }
    };

    const onFinish = () => {
        const normalized = plate.trim().toUpperCase();
        if (!PLATE_RE.test(normalized)) {
            sheet.show({ variant: 'error', title: 'Invalid vehicle number', message: 'Enter a valid Indian registration, e.g. DL 8S CB 4421.' });
            return;
        }
        if (!locationGranted) {
            sheet.show({ variant: 'warning', title: 'Enable location', message: 'Live location is required before you can go online and receive jobs.' });
            return;
        }
        setLoading(true);
        setTimeout(() => {
            setVehicleProfile(type, normalized);
            setLoading(false);
            router.replace('/(tabs)');
        }, 500);
    };

    return (
        <View style={styles.container}>
            <ScreenHeader title="Vehicle setup" showBack={false} />
            <ScrollView
                contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <Text style={styles.headline}>Tell us about{'\n'}your vehicle</Text>
                <Text style={styles.helper}>We'll match you with jobs that fit your vehicle and route.</Text>

                {/* Vehicle type */}
                <Text style={styles.section}>Vehicle type</Text>
                <View style={styles.optionList}>
                    {OPTIONS.map((o) => {
                        const active = type === o.key;
                        return (
                            <Pressable
                                key={o.key}
                                onPress={() => setType(o.key)}
                                style={[styles.option, active && styles.optionActive]}
                            >
                                <View style={styles.optionImageWrap}>
                                    <Image source={VEHICLE_IMAGES[o.key]} style={styles.optionImage} resizeMode="contain" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.optionLabel}>{o.label}</Text>
                                    <Text style={styles.optionSub}>{o.sub}</Text>
                                </View>
                                <View style={[styles.radio, active && styles.radioActive]}>
                                    {active ? <Check size={12} color={colors.primaryForeground} strokeWidth={3} /> : null}
                                </View>
                            </Pressable>
                        );
                    })}
                </View>

                {/* Plate */}
                <Text style={styles.section}>Vehicle registration number</Text>
                <Input
                    placeholder="DL 8S CB 4421"
                    autoCapitalize="characters"
                    maxLength={13}
                    value={plate}
                    onChangeText={(t) => setPlate(t.toUpperCase())}
                />
                <Text style={styles.hint}>Enter exactly as on your RC — state code, district, series and number.</Text>

                {/* Location */}
                <Text style={styles.section}>Live location</Text>
                <Pressable
                    onPress={requestLocation}
                    style={[styles.locCard, locationGranted && styles.locCardOn]}
                >
                    <View style={[styles.locIcon, locationGranted && styles.locIconOn]}>
                        <MapPin size={18} color={locationGranted ? colors.primaryForeground : colors.primary} strokeWidth={2.2} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.locTitle}>{locationGranted ? 'Location enabled' : 'Enable live location'}</Text>
                        <Text style={styles.locSub}>
                            {locationGranted
                                ? 'Used only while you are online.'
                                : 'Required to match you with nearby jobs and share ETA with customers.'}
                        </Text>
                    </View>
                    {locationGranted ? <Check size={16} color={colors.success} strokeWidth={2.8} /> : null}
                </Pressable>

                <Button label="Start driving" loading={loading} onPress={onFinish} style={{ marginTop: 22 }} />
            </ScrollView>

            <BottomSheet visible={sheet.visible} {...sheet.config} onClose={sheet.hide} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    body: { paddingHorizontal: 6, paddingTop: 14 },
    headline: { fontSize: 26, fontFamily: fonts.displayBold, color: colors.foreground, letterSpacing: -0.6, lineHeight: 32, paddingHorizontal: 6 },
    helper: { fontSize: 13, fontFamily: fonts.body, color: colors.mutedForeground, marginTop: 8, paddingHorizontal: 6 },
    section: { fontSize: 11, fontFamily: fonts.bodyBold, color: colors.mutedForeground, letterSpacing: 0.6, textTransform: 'uppercase', paddingHorizontal: 6, marginTop: 22, marginBottom: 8 },
    optionList: { gap: 6 },
    option: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12 },
    optionActive: { borderColor: colors.primary, backgroundColor: colors.card },
    optionImageWrap: { width: 56, height: 56, borderRadius: radius.sm, backgroundColor: colors.chipBg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    optionImage: { width: 52, height: 52 },
    optionLabel: { fontSize: 14, fontFamily: fonts.bodyBold, color: colors.foreground },
    optionSub: { fontSize: 11, fontFamily: fonts.body, color: colors.mutedForeground, marginTop: 2 },
    radio: { width: 20, height: 20, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    radioActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    hint: { fontSize: 11, fontFamily: fonts.body, color: colors.mutedForeground, marginTop: 6, paddingHorizontal: 6 },
    locCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12 },
    locCardOn: { borderColor: colors.success },
    locIcon: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: colors.chipBg, alignItems: 'center', justifyContent: 'center' },
    locIconOn: { backgroundColor: colors.success },
    locTitle: { fontSize: 14, fontFamily: fonts.bodyBold, color: colors.foreground },
    locSub: { fontSize: 11, fontFamily: fonts.body, color: colors.mutedForeground, marginTop: 2 },
});
