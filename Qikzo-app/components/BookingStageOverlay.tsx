import React, { useEffect, useMemo, useRef } from 'react';
import { Modal, View, Text, StyleSheet, Animated, Easing, Dimensions, Vibration, Platform, Image, ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Radar, BadgeCheck, Sparkles, MapPin, Home, PartyPopper } from 'lucide-react-native';
import { colors, fonts, radius } from '@/lib/theme';
import Button from './Button';

// expo-av is loaded lazily so the overlay still renders if the module errors
// on any given platform (e.g. web SSR). Missing audio degrades to vibration only.
let AudioMod: any = null;
try { AudioMod = require('expo-av'); } catch { AudioMod = null; }

// Vehicle art (transparent PNGs, all facing right — matches drive direction).
const VEHICLE_IMAGES: Record<VehicleKind, ImageSourcePropType> = {
    bike: require('../assets/images/vehicle-bike.png'),
    auto: require('../assets/images/vehicle-bike.png'),
    car: require('../assets/images/vehicle-bike.png'),
};

// Per-vehicle drive tuning — animation duration + playback rate keep the
// engine sound length matched to how long the vehicle takes to cross screen.
const VEHICLE_TUNING: Record<VehicleKind, { driveMs: number; rate: number; width: number; height: number; bottom: number }> = {
    bike: { driveMs: 2600, rate: 1.15, width: 190, height: 118, bottom: 12 },
    auto: { driveMs: 3000, rate: 0.95, width: 180, height: 130, bottom: 10 },
    car: { driveMs: 3200, rate: 0.85, width: 230, height: 128, bottom: 14 },
};

// Public CC0 sfx (Mixkit CDN, mp3). Motorcycle pass for two-wheelers, car
// pass-by for the cab so the audio actually matches what you see driving.
const ENGINE_URL_BIKE = 'https://assets.mixkit.co/active_storage/sfx/2681/2681-preview.mp3';
const ENGINE_URL_CAR = 'https://assets.mixkit.co/active_storage/sfx/2681/2681-preview.mp3';
const SUCCESS_URL = 'https://assets.mixkit.co/active_storage/sfx/270/270-preview.mp3';

export type VehicleKind = 'bike' | 'auto' | 'car';


export type Stage = 'searching' | 'accepted' | 'delivered';

type Props = {
    visible: boolean;
    stage: Stage;
    vehicle?: VehicleKind;          // Which vehicle to render on the "accepted" stage
    riderName?: string;
    userName?: string;
    bookingId?: string;
    onDismiss?: () => void;         // Delivered — user closes the celebration
    onCancel?: () => void;          // Searching — cancel the request
    onContinue?: () => void;        // Accepted — auto or manual advance
    autoDismissMs?: number;         // Accepted auto-hides after N ms
};

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Immersive full-screen state renderer for the booking lifecycle.
//  • searching → radar with pulsing rings + rotating scanner
//  • accepted  → real vehicle art (bike/auto/car) drives across, engine sfx
//                is speed-matched to the animation via playback rate
//  • delivered → success celebration with user's name + confetti burst
export default function BookingStageOverlay({
    visible, stage, vehicle = 'bike', riderName, userName, bookingId,
    onDismiss, onCancel, onContinue, autoDismissMs,
}: Props) {
    const soundRef = useRef<any>(null);

    // Play/stop appropriate audio per stage. Best-effort — never throws.
    useEffect(() => {
        let cancelled = false;
        async function play(url: string, opts: { loop: boolean; rate?: number }) {
            if (!AudioMod?.Audio) return;
            try {
                await AudioMod.Audio.setAudioModeAsync({ playsInSilentModeIOS: true, shouldDuckAndroid: true });
                const { sound } = await AudioMod.Audio.Sound.createAsync(
                    { uri: url },
                    {
                        shouldPlay: true,
                        isLooping: opts.loop,
                        volume: 0.9,
                        rate: opts.rate ?? 1,
                        shouldCorrectPitch: false, // keep pitch shift so slower rate = deeper engine
                    }
                );
                if (cancelled) { await sound.unloadAsync().catch(() => { }); return; }
                soundRef.current = sound;
            } catch { /* audio is optional */ }
        }

        if (visible && stage === 'accepted') {
            const t = VEHICLE_TUNING[vehicle];
            // One-shot pass — sound rate mirrors animation speed so the
            // engine builds/fades as the vehicle crosses the screen.
            const url = vehicle === 'car' ? ENGINE_URL_CAR : ENGINE_URL_BIKE;
            play(url, { loop: false, rate: t.rate });
            if (Platform.OS !== 'web') {
                // Heavier rumble for the car, quick blips for the bike.
                const pattern = vehicle === 'car' ? [0, 80, 120, 80] : [0, 40, 80, 40];
                Vibration.vibrate(pattern, false);
            }
        }
        if (visible && stage === 'delivered') {
            play(SUCCESS_URL, { loop: false });
            if (Platform.OS !== 'web') Vibration.vibrate(80);
        }

        return () => {
            cancelled = true;
            Vibration.cancel();
            const s = soundRef.current;
            soundRef.current = null;
            if (s) s.stopAsync?.().catch(() => { }).finally(() => s.unloadAsync?.().catch(() => { }));
        };
    }, [visible, stage, vehicle]);

    // Auto-continue the "accepted" screen after a moment so the user isn't stuck.
    useEffect(() => {
        if (!visible || !autoDismissMs || !onContinue) return;
        const t = setTimeout(() => onContinue(), autoDismissMs);
        return () => clearTimeout(t);
    }, [visible, autoDismissMs, onContinue]);

    return (
        <Modal visible={visible} animationType="fade" statusBarTranslucent transparent={false}>
            {stage === 'searching' && <SearchingStage onCancel={onCancel} />}
            {stage === 'accepted' && <AcceptedStage riderName={riderName} vehicle={vehicle} />}
            {stage === 'delivered' && (
                <DeliveredStage userName={userName} bookingId={bookingId} onDismiss={onDismiss} />
            )}
        </Modal>
    );
}


/* ---------------- Searching for rider ---------------- */
function SearchingStage({ onCancel }: { onCancel?: () => void }) {
    const insets = useSafeAreaInsets();
    const ring = useRef(new Animated.Value(0)).current;
    const scan = useRef(new Animated.Value(0)).current;
    const dots = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(Animated.timing(ring, { toValue: 1, duration: 1800, easing: Easing.out(Easing.cubic), useNativeDriver: true })).start();
        Animated.loop(Animated.timing(scan, { toValue: 1, duration: 2400, easing: Easing.linear, useNativeDriver: true })).start();
        Animated.loop(Animated.timing(dots, { toValue: 1, duration: 1400, easing: Easing.linear, useNativeDriver: true })).start();
    }, []);

    const rings = useMemo(() => [0, 0.33, 0.66], []);
    const rotate = scan.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

    return (
        <View style={[styles.fullDark, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <View style={styles.centerBlock}>
                <View style={styles.radar}>
                    {rings.map((offset, i) => {
                        const v = Animated.add(ring, new Animated.Value(offset));
                        const scale = v.interpolate({ inputRange: [0, 1, 2], outputRange: [0.4, 1.7, 1.7] });
                        const opacity = v.interpolate({ inputRange: [0, 0.8, 1, 2], outputRange: [0.55, 0.1, 0, 0] });
                        return (
                            <Animated.View
                                key={i}
                                style={[styles.radarRing, { transform: [{ scale }], opacity }]}
                            />
                        );
                    })}
                    <Animated.View style={[styles.radarScanner, { transform: [{ rotate }] }]} />
                    <View style={styles.radarCore}>
                        <Radar size={54} color={colors.accent} strokeWidth={1.6} />
                    </View>
                </View>

                <Text style={styles.bigTitle}>Finding your rider…</Text>
                <AnimatedDots value={dots} />
                <Text style={styles.bigSub}>Reaching out to the nearest captains near your pickup.</Text>
            </View>

            {onCancel ? (
                <View style={styles.bottomBar}>
                    <Button label="Cancel request" variant="outline" onPress={onCancel} />
                </View>
            ) : null}
        </View>
    );
}

function AnimatedDots({ value }: { value: Animated.Value }) {
    const opacities = [0, 0.33, 0.66].map((offset) =>
        Animated.add(value, new Animated.Value(offset)).interpolate({
            inputRange: [0, 0.5, 1, 1.5, 2],
            outputRange: [0.2, 1, 0.2, 1, 0.2],
        })
    );
    return (
        <View style={styles.dotsRow}>
            {opacities.map((op, i) => (
                <Animated.View key={i} style={[styles.dot, { opacity: op }]} />
            ))}
        </View>
    );
}

/* ---------------- Rider accepted (vehicle drives across) ---------------- */
function AcceptedStage({ riderName, vehicle }: { riderName?: string; vehicle: VehicleKind }) {
    const insets = useSafeAreaInsets();
    const drive = useRef(new Animated.Value(0)).current;
    const bob = useRef(new Animated.Value(0)).current;
    const dust = useRef(new Animated.Value(0)).current;

    const tuning = VEHICLE_TUNING[vehicle];
    // Faster vehicles bob quicker — keeps the visual rhythm tied to the sound.
    const bobStep = Math.round(180 * (1 / tuning.rate));
    const dustStep = Math.round(500 * (1 / tuning.rate));

    useEffect(() => {
        Animated.timing(drive, {
            toValue: 1,
            duration: tuning.driveMs,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
        }).start();
        Animated.loop(
            Animated.sequence([
                Animated.timing(bob, { toValue: 1, duration: bobStep, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
                Animated.timing(bob, { toValue: 0, duration: bobStep, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
            ])
        ).start();
        Animated.loop(
            Animated.timing(dust, { toValue: 1, duration: dustStep, easing: Easing.linear, useNativeDriver: true })
        ).start();
    }, [vehicle]);

    const translateX = drive.interpolate({
        inputRange: [0, 1],
        outputRange: [-(tuning.width + 20), SCREEN_W + 60],
    });
    // Bike bobs more than the car (car has suspension damping in real life).
    const bobRange = vehicle === 'car' ? -2 : vehicle === 'bike' ? -4 : -3;
    const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, bobRange] });

    return (
        <View style={[styles.fullDark, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <View style={styles.centerBlock}>
                <View style={styles.acceptedBadge}>
                    <BadgeCheck size={14} color={colors.accent} />
                    <Text style={styles.acceptedBadgeText}>Rider accepted</Text>
                </View>
                <Text style={styles.bigTitle}>{riderName ? `${riderName.split(' ')[0]} is on the way!` : 'Your rider is on the way!'}</Text>
                <Text style={styles.bigSub}>Sit tight — your captain is heading to your pickup point.</Text>
            </View>

            {/* Road strip with the moving vehicle art (facing right = drive direction) */}
            <View style={styles.road}>
                <RoadLines />
                <Animated.View
                    style={[
                        styles.bikeTravel,
                        { bottom: tuning.bottom, transform: [{ translateX }, { translateY }] },
                    ]}
                >
                    <DustPuffs value={dust} />
                    <Image
                        source={VEHICLE_IMAGES[vehicle]}
                        resizeMode="contain"
                        style={{ width: tuning.width, height: tuning.height }}
                    />
                </Animated.View>
            </View>
        </View>
    );

}

function RoadLines() {
    const slide = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.loop(Animated.timing(slide, { toValue: 1, duration: 500, easing: Easing.linear, useNativeDriver: true })).start();
    }, []);
    const translateX = slide.interpolate({ inputRange: [0, 1], outputRange: [0, -48] });
    const dashes = Array.from({ length: Math.ceil(SCREEN_W / 48) + 4 });
    return (
        <Animated.View style={[styles.roadLineWrap, { transform: [{ translateX }] }]}>
            {dashes.map((_, i) => (
                <View key={i} style={styles.roadDash} />
            ))}
        </Animated.View>
    );
}

function DustPuffs({ value }: { value: Animated.Value }) {
    const puffs = [0, 0.3, 0.6];
    return (
        <View style={styles.dustWrap}>
            {puffs.map((off, i) => {
                const v = Animated.add(value, new Animated.Value(off));
                const opacity = v.interpolate({ inputRange: [0, 0.6, 1, 2], outputRange: [0.6, 0.1, 0, 0] });
                const scale = v.interpolate({ inputRange: [0, 1, 2], outputRange: [0.5, 1.4, 1.4] });
                const tx = v.interpolate({ inputRange: [0, 1, 2], outputRange: [0, -22, -22] });
                return (
                    <Animated.View key={i} style={[styles.puff, { opacity, transform: [{ scale }, { translateX: tx }] }]} />
                );
            })}
        </View>
    );
}

/* ---------------- Delivered ---------------- */
function DeliveredStage({
    userName, bookingId, onDismiss,
}: { userName?: string; bookingId?: string; onDismiss?: () => void }) {
    const insets = useSafeAreaInsets();
    const pop = useRef(new Animated.Value(0)).current;
    const glow = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(pop, { toValue: 1, useNativeDriver: true, friction: 5, tension: 90 }).start();
        Animated.loop(
            Animated.sequence([
                Animated.timing(glow, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
                Animated.timing(glow, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
            ])
        ).start();
    }, []);

    const scale = pop.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] });
    const opacity = pop.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
    const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.55] });
    const glowScale = glow.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.15] });

    const name = (userName && userName !== 'Guest') ? userName.split(' ')[0] : 'there';

    return (
        <View style={[styles.fullLight, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <Confetti />
            <View style={styles.centerBlock}>
                <View style={styles.deliveredMark}>
                    <Animated.View style={[styles.deliveredGlow, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />
                    <Animated.View style={{ opacity, transform: [{ scale }] }}>
                        <View style={styles.deliveredCircle}>
                            <BadgeCheck size={96} color="#FFFFFF" strokeWidth={2.2} />
                        </View>
                    </Animated.View>
                </View>

                <View style={styles.partyRow}>
                    <PartyPopper size={18} color={colors.accent} />
                    <Text style={styles.deliveredKicker}>Delivered successfully</Text>
                    <Sparkles size={18} color={colors.accent} />
                </View>
                <Text style={styles.deliveredTitle}>Thank you, {name}!</Text>
                <Text style={styles.deliveredSub}>
                    Your order {bookingId ? <Text style={styles.deliveredId}>#{bookingId} </Text> : null}
                    has been dropped safely. We hope you enjoyed riding with Qikzo.
                </Text>

                <View style={styles.pathRow}>
                    <View style={styles.pathIcon}><MapPin size={14} color="#FFFFFF" /></View>
                    <View style={styles.pathTrack}>
                        {Array.from({ length: 14 }).map((_, i) => (
                            <View key={i} style={styles.pathDash} />
                        ))}
                    </View>
                    <View style={[styles.pathIcon, { backgroundColor: colors.accent }]}>
                        <Home size={14} color={colors.primary} />
                    </View>
                </View>
            </View>

            <View style={styles.bottomBar}>
                <Button label="Done" onPress={onDismiss} />
            </View>
        </View>
    );
}

function Confetti() {
    const value = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.loop(Animated.timing(value, { toValue: 1, duration: 3200, easing: Easing.linear, useNativeDriver: true })).start();
    }, []);
    const bits = useMemo(
        () =>
            Array.from({ length: 22 }).map((_, i) => ({
                x: (i / 22) * SCREEN_W + ((i * 47) % 20),
                delay: (i % 10) / 10,
                hue: [colors.accent, colors.primary, colors.success, '#E5B769', '#C0392B'][i % 5],
                size: 6 + (i % 3) * 2,
            })),
        []
    );
    return (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            {bits.map((b, i) => {
                const v = Animated.add(value, new Animated.Value(b.delay));
                const translateY = v.interpolate({ inputRange: [0, 1, 2], outputRange: [-30, SCREEN_H + 30, SCREEN_H + 30] });
                const rotate = v.interpolate({ inputRange: [0, 1, 2], outputRange: ['0deg', '540deg', '540deg'] });
                const opacity = v.interpolate({ inputRange: [0, 0.85, 1, 2], outputRange: [0.9, 0.9, 0, 0] });
                return (
                    <Animated.View
                        key={i}
                        style={[
                            styles.confetti,
                            { left: b.x, width: b.size, height: b.size * 1.6, backgroundColor: b.hue, transform: [{ translateY }, { rotate }], opacity },
                        ]}
                    />
                );
            })}
        </View>
    );
}

const DARK = '#0B1F1E';
const styles = StyleSheet.create({
    fullDark: { flex: 1, backgroundColor: DARK, alignItems: 'center', justifyContent: 'space-between' },
    fullLight: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'space-between' },
    centerBlock: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, width: '100%' },

    // ---- Searching ----
    radar: { width: 220, height: 220, alignItems: 'center', justifyContent: 'center', marginBottom: 26 },
    radarRing: { position: 'absolute', width: 220, height: 220, borderRadius: 220, borderWidth: 1.5, borderColor: colors.accent },
    radarScanner: {
        position: 'absolute', width: 220, height: 220, borderRadius: 220,
        borderTopWidth: 2, borderTopColor: colors.accent, borderLeftWidth: 2, borderLeftColor: 'transparent',
        borderRightWidth: 2, borderRightColor: 'transparent', borderBottomWidth: 2, borderBottomColor: 'transparent',
    },
    radarCore: {
        width: 92, height: 92, borderRadius: 92, backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1, borderColor: 'rgba(229,183,105,0.35)', alignItems: 'center', justifyContent: 'center',
    },
    bigTitle: { color: '#FFFFFF', fontSize: 24, fontFamily: fonts.displayBold, textAlign: 'center', marginTop: 6, letterSpacing: -0.3 },
    bigSub: { color: 'rgba(255,255,255,0.72)', fontSize: 14, fontFamily: fonts.body, textAlign: 'center', marginTop: 8, lineHeight: 20, maxWidth: 300 },
    dotsRow: { flexDirection: 'row', gap: 6, marginTop: 10 },
    dot: { width: 6, height: 6, borderRadius: 6, backgroundColor: colors.accent },

    // ---- Accepted / road ----
    acceptedBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 10, paddingVertical: 5,
        borderWidth: 1, borderColor: 'rgba(229,183,105,0.6)', borderRadius: radius.pill,
        backgroundColor: 'rgba(229,183,105,0.08)', marginBottom: 14,
    },
    acceptedBadgeText: { color: colors.accent, fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 0.5 },
    road: {
        width: '100%', height: 140, backgroundColor: '#03110F',
        borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
        borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
        justifyContent: 'center', overflow: 'hidden',
    },
    roadLineWrap: { position: 'absolute', top: '50%', left: 0, right: -100, flexDirection: 'row', gap: 24 },
    roadDash: { width: 24, height: 3, backgroundColor: 'rgba(229,183,105,0.55)', borderRadius: 2 },
    bikeTravel: { position: 'absolute', bottom: 18, flexDirection: 'row', alignItems: 'flex-end' },
    bikeEmoji: { fontSize: 84, lineHeight: 92, includeFontPadding: false, textShadowColor: 'rgba(0,0,0,0.45)', textShadowRadius: 6, textShadowOffset: { width: 0, height: 2 } },
    dustWrap: { position: 'absolute', left: 6, bottom: 8, flexDirection: 'row' },
    puff: { width: 14, height: 14, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.35)', marginRight: -4 },

    // ---- Delivered ----
    deliveredMark: { width: 220, height: 220, alignItems: 'center', justifyContent: 'center' },
    deliveredGlow: { position: 'absolute', width: 220, height: 220, borderRadius: 220, backgroundColor: colors.success },
    deliveredCircle: {
        width: 160, height: 160, borderRadius: 160, backgroundColor: colors.success,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: colors.success, shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 12,
    },
    partyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 22 },
    deliveredKicker: { color: colors.accent, fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase' },
    deliveredTitle: { color: colors.foreground, fontSize: 30, fontFamily: fonts.displayBold, marginTop: 10, letterSpacing: -0.5, textAlign: 'center' },
    deliveredSub: { color: colors.mutedForeground, fontSize: 14, fontFamily: fonts.body, textAlign: 'center', marginTop: 10, lineHeight: 21, maxWidth: 320 },
    deliveredId: { color: colors.foreground, fontFamily: fonts.bodyBold },

    pathRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24 },
    pathIcon: { width: 30, height: 30, borderRadius: 30, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    pathTrack: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    pathDash: { width: 6, height: 2, backgroundColor: colors.border, borderRadius: 2 },

    confetti: { position: 'absolute', top: 0, borderRadius: 2 },

    bottomBar: { width: '100%', paddingHorizontal: 16, paddingBottom: 10 },
});
