import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, useWindowDimensions, Pressable, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ShoppingBasket, Truck, ShieldCheck } from 'lucide-react-native';
import { colors, fonts } from '@/lib/theme';
import Button from '@/components/Button';
import { useAuth } from '@/lib/authStore';

type Slide = {
    key: string;
    title: string;
    sub: string;
    Icon: typeof ShoppingBasket;
};

const SLIDES: Slide[] = [
    {
        key: 's1',
        title: 'Daily groceries\nat your door',
        sub: 'Shop fresh fruits, vegetables, dairy and staples — handpicked every morning.',
        Icon: ShoppingBasket,
    },
    {
        key: 's2',
        title: 'Delivered in\nminutes',
        sub: 'Riders near you pick and pack your order, so it reaches you while it is still fresh.',
        Icon: Truck,
    },
    {
        key: 's3',
        title: 'Safe payments,\nzero hassle',
        sub: 'UPI, cards or cash on delivery — pay the way that suits you, with full order tracking.',
        Icon: ShieldCheck,
    },
];

export default function Onboarding() {
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const setOnboarded = useAuth((s) => s.setOnboarded);
    const [index, setIndex] = useState(0);
    const listRef = useRef<FlatList<Slide>>(null);
    const scrollX = useRef(new Animated.Value(0)).current;

    const finish = () => {
        setOnboarded(true);
        router.replace('/login');
    };

    const next = () => {
        if (index < SLIDES.length - 1) {
            listRef.current?.scrollToIndex({ index: index + 1, animated: true });
        } else {
            finish();
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 12 }]}>
            <View style={styles.topBar}>
                <Text style={styles.brand}>Qizko</Text>
                {index < SLIDES.length - 1 ? (
                    <Pressable onPress={finish} hitSlop={10}><Text style={styles.skip}>Skip</Text></Pressable>
                ) : (
                    <View style={{ width: 30 }} />
                )}
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
                    {
                        useNativeDriver: false, listener: (e: any) => {
                            const i = Math.round(e.nativeEvent.contentOffset.x / width);
                            if (i !== index) setIndex(i);
                        }
                    }
                )}
                scrollEventThrottle={16}
                renderItem={({ item, index: i }) => {
                    const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
                    const iconScale = scrollX.interpolate({ inputRange, outputRange: [0.7, 1, 0.7], extrapolate: 'clamp' });
                    const iconOpacity = scrollX.interpolate({ inputRange, outputRange: [0.2, 1, 0.2], extrapolate: 'clamp' });
                    const textTranslate = scrollX.interpolate({ inputRange, outputRange: [40, 0, -40], extrapolate: 'clamp' });
                    const Icon = item.Icon;
                    return (
                        <View style={[styles.slide, { width }]}>
                            <Animated.View style={[styles.iconBox, { opacity: iconOpacity, transform: [{ scale: iconScale }] }]}>
                                <View style={styles.iconRing} />
                                <Icon size={88} color={colors.foreground} strokeWidth={1.4} />
                                <View style={styles.iconDot} />
                            </Animated.View>
                            <Animated.View style={[styles.textWrap, { width: width - 36, transform: [{ translateX: textTranslate }] }]}>
                                <Text style={styles.title}>{item.title}</Text>
                                <Text style={styles.sub}>{item.sub}</Text>
                            </Animated.View>
                        </View>
                    );
                }}
            />

            <View style={styles.dots}>
                {SLIDES.map((_, i) => {
                    const w = scrollX.interpolate({
                        inputRange: [(i - 1) * width, i * width, (i + 1) * width],
                        outputRange: [8, 24, 8],
                        extrapolate: 'clamp',
                    });
                    const bg = scrollX.interpolate({
                        inputRange: [(i - 1) * width, i * width, (i + 1) * width],
                        outputRange: [colors.border, colors.foreground, colors.border],
                        extrapolate: 'clamp',
                    });
                    return <Animated.View key={i} style={[styles.dot, { width: w, backgroundColor: bg as any }]} />;
                })}
            </View>

            <View style={styles.actions}>
                <Button label={index === SLIDES.length - 1 ? 'Get started' : 'Next'} onPress={next} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 6 },
    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 10 },
    brand: { fontSize: 18, fontFamily: fonts.displayBold, color: colors.foreground, letterSpacing: -0.4 },
    skip: { fontSize: 13, fontFamily: fonts.bodyBold, color: colors.mutedForeground },
    slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
    textWrap: { alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
    iconBox: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center', marginBottom: 36, alignSelf: 'center' },
    iconRing: { position: 'absolute', width: 180, height: 180, borderWidth: 1, borderColor: colors.border },
    iconDot: { position: 'absolute', top: 20, right: 20, width: 10, height: 10, backgroundColor: colors.accent },
    title: { fontSize: 30, fontFamily: fonts.displayBold, color: colors.foreground, letterSpacing: -0.6, textAlign: 'center', lineHeight: 36 },
    sub: { fontSize: 14, fontFamily: fonts.body, color: colors.mutedForeground, textAlign: 'center', marginTop: 12, lineHeight: 21, paddingHorizontal: 12 },
    dots: { flexDirection: 'row', alignSelf: 'center', gap: 6, marginBottom: 18 },
    dot: { height: 6, backgroundColor: colors.border },
    actions: { paddingHorizontal: 6 },
});
