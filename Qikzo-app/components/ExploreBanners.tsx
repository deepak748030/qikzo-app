import React, { useEffect, useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet, useWindowDimensions, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { colors, fonts, radius } from '@/lib/theme';
import { useBooking } from '@/lib/bookingStore';
import { catalogApi, type ServerBanner } from '@/lib/api/endpoints/catalog';

/**
 * Explore — horizontally scrolling 1:1 banner tiles below the main carousel.
 * Uses the same location-aware `/banners` endpoint so nearby promos surface
 * first here as well. Request is deduped by the api client.
 */
type Banner = ServerBanner;

export default function ExploreBanners({ userCoord }: { userCoord?: { lat: number; lng: number } | null } = {}) {
    const { width } = useWindowDimensions();
    const setDraft = useBooking((s) => s.setDraft);
    const [banners, setBanners] = useState<Banner[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let alive = true;
        catalogApi
            .listBanners(userCoord ? { lat: userCoord.lat, lng: userCoord.lng } : undefined)
            .then((items) => {
                if (!alive) return;
                setBanners(items.filter((b) => b.active !== false && !!b.imageUrl));
            })
            .catch(() => { })
            .finally(() => alive && setLoading(false));
        return () => { alive = false; };
    }, [userCoord?.lat, userCoord?.lng]);

    const openBanner = (b: Banner) => {
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

    const tile = Math.min(160, Math.round(width * 0.44));

    if (loading) {
        return (
            <View style={{ marginTop: 18, marginBottom: 20 }}>
                <Text style={styles.section}>Explore</Text>
                <ActivityIndicator style={{ marginTop: 16 }} color={colors.primary} />
            </View>
        );
    }
    if (banners.length === 0) return null;

    return (
        <View style={{ marginTop: 18, marginBottom: 20 }}>
            <Text style={styles.section}>Explore</Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.row}
            >
                {banners.map((b) => (
                    <Pressable
                        key={b._id}
                        style={[styles.card, { width: tile, height: tile }]}
                        onPress={() => openBanner(b)}
                    >
                        <Image source={{ uri: b.imageUrl }} style={styles.img} resizeMode="cover" />
                        <View style={styles.overlay} />
                        <View style={styles.body}>
                            <Text style={styles.title} numberOfLines={2}>{b.title}</Text>
                            {b.areaName || b.subtitle ? (
                                <Text style={styles.sub} numberOfLines={1}>{b.areaName || b.subtitle}</Text>
                            ) : null}
                        </View>
                    </Pressable>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        fontSize: 12, fontFamily: fonts.bodyBold, color: colors.mutedForeground,
        paddingHorizontal: 12, marginBottom: 8,
        letterSpacing: 0.6, textTransform: 'uppercase',
    },
    row: { paddingHorizontal: 12, gap: 10 },
    card: {
        borderRadius: radius.md, overflow: 'hidden',
        backgroundColor: colors.card,
        borderWidth: 1, borderColor: colors.border,
    },
    img: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
    overlay: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.32)',
    },
    body: { position: 'absolute', left: 10, right: 10, bottom: 10 },
    title: { fontSize: 14, fontFamily: fonts.displayBold, color: '#FFFFFF' },
    sub: { fontSize: 10, fontFamily: fonts.body, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
});

