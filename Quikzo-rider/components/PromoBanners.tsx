import React, { useEffect, useRef } from 'react';
import { View, Text, Image, Pressable, FlatList, StyleSheet, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { MapPin } from 'lucide-react-native';
import { colors, fonts } from '@/lib/theme';
import { promoBanners, PromoBanner } from '@/lib/mockData';
import { useBooking } from '@/lib/bookingStore';

// Horizontally scrollable, edge-to-edge banners with auto-scroll + infinite loop.
// Each card is exactly the screen width so it sits flush against the screen edges.
// We render the banner list 3x so the user can scroll left/right seamlessly and
// re-center to the middle copy on wrap for a truly looped feel.
const AUTO_MS = 3500;
const COPIES = 3;

export default function PromoBanners() {
    const { width } = useWindowDimensions();
    const setDraft = useBooking((s) => s.setDraft);
    const listRef = useRef<FlatList<PromoBanner>>(null);
    const indexRef = useRef(promoBanners.length); // start in the middle copy
    const pausedUntilRef = useRef(0);

    // Tripled data set enables seamless left+right looping.
    const data = React.useMemo(
        () => Array.from({ length: COPIES }).flatMap(() => promoBanners),
        []
    );

    const openBannerLocation = (b: PromoBanner) => {
        setDraft({ drop: b.address, dropCoord: b.coord });
        router.push({ pathname: '/select-location', params: { field: 'drop' } });
    };

    // Start centered so the user can swipe either direction from the first tick.
    useEffect(() => {
        const t = setTimeout(() => {
            listRef.current?.scrollToOffset({ offset: indexRef.current * width, animated: false });
        }, 0);
        return () => clearTimeout(t);
    }, [width]);

    // Auto-advance every AUTO_MS. Pauses briefly after a manual swipe so we
    // don't fight the user's finger.
    useEffect(() => {
        const id = setInterval(() => {
            if (Date.now() < pausedUntilRef.current) return;
            indexRef.current += 1;
            listRef.current?.scrollToOffset({ offset: indexRef.current * width, animated: true });
        }, AUTO_MS);
        return () => clearInterval(id);
    }, [width]);

    const onMomentumEnd = (e: any) => {
        const x = e.nativeEvent.contentOffset.x;
        const idx = Math.round(x / width);
        indexRef.current = idx;
        // Re-center to middle copy when we drift into first/last copy for infinite feel.
        const min = promoBanners.length;
        const max = promoBanners.length * (COPIES - 1);
        if (idx < min || idx >= max) {
            const centered = min + (idx % promoBanners.length);
            indexRef.current = centered;
            listRef.current?.scrollToOffset({ offset: centered * width, animated: false });
        }
    };

    return (
        <FlatList
            ref={listRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            data={data}
            keyExtractor={(_, i) => `promo-${i}`}
            style={{ marginTop: 14 }}
            onScrollBeginDrag={() => { pausedUntilRef.current = Date.now() + AUTO_MS * 2; }}
            onMomentumScrollEnd={onMomentumEnd}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            initialScrollIndex={promoBanners.length}
            renderItem={({ item }) => (
                <Pressable style={[styles.card, { width }]} onPress={() => openBannerLocation(item)}>
                    <Image source={item.image} style={styles.img} resizeMode="cover" />
                    <View style={styles.overlay} />
                    <View style={styles.body}>
                        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                        <View style={styles.metaRow}>
                            <MapPin size={11} color={'rgba(255,255,255,0.9)'} strokeWidth={2} />
                            <Text style={styles.sub} numberOfLines={1}>
                                {item.subtitle} · {item.coord.lat.toFixed(3)}, {item.coord.lng.toFixed(3)}
                            </Text>
                        </View>
                    </View>
                </Pressable>
            )}
        />
    );
}

const styles = StyleSheet.create({
    card: {
        height: 140,
        // no border radius, no margin — edge-to-edge
    },
    img: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
    overlay: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.35)',
    },
    body: { position: 'absolute', left: 12, right: 12, bottom: 12 },
    title: { fontSize: 18, fontFamily: fonts.displayBold, color: '#FFFFFF' },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    sub: { fontSize: 11, fontFamily: fonts.body, color: 'rgba(255,255,255,0.9)' },
});
// Note: colors import kept for parity with theme usage elsewhere.
void colors;
