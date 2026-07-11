import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, useWindowDimensions, Pressable, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowRight, Bike, Wallet, Navigation2 } from 'lucide-react-native';
import { colors, fonts, radius } from '@/lib/theme';
import { useAuth } from '@/lib/authStore';

type Slide = {
    key: string;
    tag: string;
    title: string;
    sub: string;
    Icon: typeof Bike;
};

const SLIDES: Slide[] = [
    { key: 's1', tag: 'YOUR HOURS', title: 'Ride when\nyou want to.', sub: 'No shifts, no manager. Go online, take what fits, log off whenever.', Icon: Bike },
    { key: 's2', tag: 'NEAR YOU', title: 'Real jobs.\nOne tap in.', sub: 'Fare, distance and pickup shown up front. Decide in seconds — no guesswork.', Icon: Navigation2 },
    { key: 's3', tag: 'GET PAID', title: 'Money in,\nevery morning.', sub: 'Cash and UPI settle to your bank daily at 6 AM. No waiting, no chasing.', Icon: Wallet },
];

export default function Onboarding() {
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const setOnboarded = useAuth((s) => s.setOnboarded);
    const [index, setIndex] = useState(0);
    const listRef = useRef<FlatList<Slide>>(null);
    const scrollX = useRef(new Animated.Value(0)).current;

    const finish = () => { setOnboarded(true); router.replace('/login'); };
    const next = () => {
        if (index < SLIDES.length - 1) {
            const ni = index + 1;
            listRef.current?.scrollToOffset({ offset: ni * width, animated: true });
            setIndex(ni);
        } else {
            finish();
        }
    };

    const progress = scrollX.interpolate({
        inputRange: [0, Math.max(1, (SLIDES.length - 1) * width)],
        outputRange: [`${100 / SLIDES.length}%`, '100%'],
        extrapolate: 'clamp',
    });

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.topBar}>
                <Text style={styles.counter}>
                    <Text style={styles.counterNow}>{String(index + 1).padStart(2, '0')}</Text>
                    <Text style={styles.counterAll}> / {String(SLIDES.length).padStart(2, '0')}</Text>
                </Text>
                <Text style={styles.brand}>QIKZO · PARTNER</Text>
                {index < SLIDES.length - 1
                    ? <Pressable onPress={finish} hitSlop={12}><Text style={styles.skip}>Skip</Text></Pressable>
                    : <View style={{ width: 30 }} />}
            </View>

            <View style={styles.progressTrack}>
                <Animated.View style={[styles.progressFill, { width: progress }]} />
            </View>

            <Animated.FlatList
                ref={listRef as any}
                data={SLIDES}
                keyExtractor={(s) => s.key}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: false },
                )}
                onMomentumScrollEnd={(e) => {
                    const i = Math.round(e.nativeEvent.contentOffset.x / width);
                    if (i !== index) setIndex(i);
                }}
                scrollEventThrottle={16}
                renderItem={({ item, index: i }) => {
                    const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
                    const heroScale = scrollX.interpolate({ inputRange, outputRange: [0.85, 1, 0.85], extrapolate: 'clamp' });
                    const heroOp = scrollX.interpolate({ inputRange, outputRange: [0.2, 1, 0.2], extrapolate: 'clamp' });
                    const textT = scrollX.interpolate({ inputRange, outputRange: [30, 0, -30], extrapolate: 'clamp' });
                    const Icon = item.Icon;
                    return (
                        <View style={[styles.slide, { width }]}>
                            <Animated.View style={[styles.hero, { opacity: heroOp, transform: [{ scale: heroScale }] }]}>
                                <View style={styles.blobLg} />
                                <View style={styles.blobSm} />
                                <View style={styles.iconWrap}>
                                    <Icon size={104} color={colors.primary} strokeWidth={1.4} />
                                </View>
                                <View style={styles.tick} />
                            </Animated.View>
                            <Animated.View style={[styles.textWrap, { width: width - 48, transform: [{ translateX: textT }] }]}>
                                <Text style={styles.tag}>{item.tag}</Text>
                                <Text style={styles.title}>{item.title}</Text>
                                <Text style={styles.sub}>{item.sub}</Text>
                            </Animated.View>
                        </View>
                    );
                }}
            />

            <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
                <Text style={styles.ctaLabel}>
                    {index === SLIDES.length - 1 ? 'Start earning' : 'Continue'}
                </Text>
                <Pressable style={styles.cta} onPress={next} hitSlop={10} android_ripple={{ color: colors.primaryDark, borderless: true }}>
                    <ArrowRight size={26} color={colors.primaryForeground} strokeWidth={2.4} />
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 6 },
    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 6, paddingTop: 8, paddingBottom: 10 },
    counter: { fontSize: 12, fontFamily: fonts.bodyBold, letterSpacing: 0.6, minWidth: 60 },
    counterNow: { color: colors.foreground },
    counterAll: { color: colors.mutedForeground },
    brand: { fontSize: 11, fontFamily: fonts.bodyBold, color: colors.mutedForeground, letterSpacing: 1.2 },
    skip: { fontSize: 12, fontFamily: fonts.bodyBold, color: colors.foreground, letterSpacing: 0.4, minWidth: 30, textAlign: 'right' },
    progressTrack: { height: 2, marginHorizontal: 6, backgroundColor: colors.border },
    progressFill: { height: 2, backgroundColor: colors.primary },

    slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingTop: 20 },
    hero: { width: 280, height: 280, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
    blobLg: { position: 'absolute', width: 240, height: 240, borderRadius: 999, backgroundColor: colors.accent, opacity: 0.35, top: 20, left: 20 },
    blobSm: { position: 'absolute', width: 130, height: 130, borderRadius: 999, backgroundColor: colors.primary, opacity: 0.08, bottom: 24, right: 18 },
    iconWrap: { width: 180, height: 180, borderRadius: 999, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
    tick: { position: 'absolute', top: 34, right: 44, width: 14, height: 14, borderRadius: 999, backgroundColor: colors.primary },

    textWrap: { alignSelf: 'center', alignItems: 'flex-start' },
    tag: { fontSize: 11, fontFamily: fonts.bodyBold, color: colors.primary, letterSpacing: 1.6 },
    title: { fontSize: 34, fontFamily: fonts.displayBold, color: colors.foreground, letterSpacing: -0.8, lineHeight: 40, marginTop: 10 },
    sub: { fontSize: 14, fontFamily: fonts.body, color: colors.mutedForeground, marginTop: 12, lineHeight: 21, paddingRight: 8 },

    footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border },
    ctaLabel: { fontSize: 15, fontFamily: fonts.displayBold, color: colors.foreground, letterSpacing: -0.2 },
    cta: { width: 62, height: 62, borderRadius: radius.pill, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
