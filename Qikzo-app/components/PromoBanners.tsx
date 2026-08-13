import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, Pressable, FlatList, StyleSheet, useWindowDimensions, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { MapPin } from 'lucide-react-native';
import { colors, fonts } from '@/lib/theme';
import { useBooking } from '@/lib/bookingStore';
import { catalogApi, type ServerBanner } from '@/lib/api/endpoints/catalog';

// Horizontally scrollable, edge-to-edge banners with auto-scroll + infinite loop.
// Data comes from the server (`/categories`, `/banners`) — no local mock — so
// admins can update the home carousel in real time from the dashboard.
const AUTO_MS = 3500;
const COPIES = 3;

type Banner = ServerBanner;

export default function PromoBanners({
    userCoord,
    categorySlug,
    topGap = 14,
}: { userCoord?: { lat: number; lng: number } | null; categorySlug?: string; topGap?: number } = {}) {

    const { width } = useWindowDimensions();
    const setDraft = useBooking((s) => s.setDraft);
    const listRef = useRef<FlatList<Banner>>(null);
    const indexRef = useRef(0);
    const pausedUntilRef = useRef(0);

    const [banners, setBanners] = useState<Banner[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let alive = true;
        catalogApi
            .listBanners({
                ...(userCoord ? { lat: userCoord.lat, lng: userCoord.lng } : {}),
                ...(categorySlug ? { categorySlug } : {}),
            })
            .then((items) => {
                if (!alive) return;
                const active = items.filter((b) => b.active !== false && !!b.imageUrl);
                setBanners(active);
                indexRef.current = active.length; // start in middle copy
            })
            .catch(() => { /* silently no-op — carousel just stays hidden */ })
            .finally(() => alive && setLoading(false));
        return () => { alive = false; };
    }, [userCoord?.lat, userCoord?.lng, categorySlug]);

    // Tripled data set enables seamless left+right looping.
    const data = React.useMemo(
        () => (banners.length ? Array.from({ length: COPIES }).flatMap(() => banners) : []),
        [banners],
    );

    const openBannerLocation = (b: Banner) => {
        if (!b.coord) return;
        // Banner spots are pickup points (market / shop) — parcel is collected there.
        const pickup = b.address || b.title;
        setDraft({ pickup, pickupCoord: b.coord });
        router.push({
            pathname: '/select-location',
            params: {
                field: 'pickup',
                lat: String(b.coord.lat),
                lng: String(b.coord.lng),
                address: pickup,
            },
        });
    };

    // Start centered so the user can swipe either direction from the first tick.
    useEffect(() => {
        if (banners.length === 0) return;
        const t = setTimeout(() => {
            listRef.current?.scrollToOffset({ offset: indexRef.current * width, animated: false });
        }, 0);
        return () => clearTimeout(t);
    }, [width, banners.length]);

    // Auto-advance every AUTO_MS. Pauses briefly after a manual swipe.
    useEffect(() => {
        if (banners.length <= 1) return;
        const id = setInterval(() => {
            if (Date.now() < pausedUntilRef.current) return;
            indexRef.current += 1;
            listRef.current?.scrollToOffset({ offset: indexRef.current * width, animated: true });
        }, AUTO_MS);
        return () => clearInterval(id);
    }, [width, banners.length]);

    const onMomentumEnd = (e: any) => {
        if (banners.length === 0) return;
        const x = e.nativeEvent.contentOffset.x;
        const idx = Math.round(x / width);
        indexRef.current = idx;
        const min = banners.length;
        const max = banners.length * (COPIES - 1);
        if (idx < min || idx >= max) {
            const centered = min + (idx % banners.length);
            indexRef.current = centered;
            listRef.current?.scrollToOffset({ offset: centered * width, animated: false });
        }
    };

    if (loading) {
        return (
            <View style={[styles.card, { width, marginTop: topGap, backgroundColor: 'rgba(0,0,0,0.05)' }]}>
                <ActivityIndicator style={{ marginTop: 60 }} color={colors.primary} />
            </View>
        );
    }
    if (banners.length === 0) return null;

    return (
        <FlatList
            ref={listRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            data={data}
            keyExtractor={(_, i) => `promo-${i}`}
            style={{ marginTop: topGap }}
            onScrollBeginDrag={() => { pausedUntilRef.current = Date.now() + AUTO_MS * 2; }}
            onMomentumScrollEnd={onMomentumEnd}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            initialScrollIndex={banners.length}
            renderItem={({ item }) => (
                <Pressable style={[styles.card, { width }]} onPress={() => openBannerLocation(item)}>
                    <Image source={{ uri: item.imageUrl }} style={styles.img} resizeMode="cover" />
                    <View style={styles.overlay} />
                    <View style={styles.body}>
                        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                        {(item.subtitle || item.coord) && (
                            <View style={styles.metaRow}>
                                <MapPin size={11} color={'rgba(255,255,255,0.9)'} strokeWidth={2} />
                                <Text style={styles.sub} numberOfLines={1}>
                                    {item.subtitle || ''}
                                    {item.coord ? ` · ${item.coord.lat.toFixed(3)}, ${item.coord.lng.toFixed(3)}` : ''}
                                </Text>
                            </View>
                        )}
                    </View>
                </Pressable>
            )}
        />
    );
}

const styles = StyleSheet.create({
    card: { height: 140 },
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
void colors;
