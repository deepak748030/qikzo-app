import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronRight, ImageOff, MapPin } from 'lucide-react-native';
import { colors, fonts, radius } from '@/lib/theme';
import ScreenHeader from '@/components/ScreenHeader';
import Skeleton from '@/components/Skeleton';
import { categoryBannersApi, type BannerType, type CategoryBanner } from '@/lib/api/endpoints/categoryBanners';

function paramStr(v?: string | string[]): string {
    if (Array.isArray(v)) return String(v[0] || '');
    return v ? String(v) : '';
}

/**
 * Food / Grocery screen — the vertical list of banners the admin created for
 * this tab. Opened from the matching delivery tile on Home; every other tile
 * still goes straight to the booking screen as before.
 */
export default function CategoryBannersScreen() {
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{ type?: string | string[] }>();
    const type: BannerType = paramStr(params.type).toLowerCase() === 'grocery' ? 'grocery' : 'food';

    const [banners, setBanners] = useState<CategoryBanner[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(() => {
        let alive = true;
        setLoading(true);
        setError(null);
        // The type filter is applied server-side, so a Grocery banner can
        // never arrive on the Food screen.
        categoryBannersApi
            .list(type)
            .then((items) => { if (alive) setBanners(items.filter((b) => b.active !== false)); })
            .catch(() => { if (alive) setError('Could not load offers. Pull to retry.'); })
            .finally(() => { if (alive) setLoading(false); });
        return () => { alive = false; };
    }, [type]);

    useEffect(() => load(), [load]);
    useFocusEffect(useCallback(() => { load(); }, [load]));

    return (
        <View style={styles.container}>
            <ScreenHeader title={type === 'food' ? 'Food' : 'Grocery'} />

            {loading ? (
                <View style={{ padding: 6, gap: 8, marginTop: 10 }}>
                    {[0, 1, 2, 3].map((i) => <Skeleton key={i} height={132} rounded="md" />)}
                </View>
            ) : (
                <FlatList
                    data={banners}
                    keyExtractor={(b) => b._id}
                    contentContainerStyle={{ padding: 6, gap: 10, paddingBottom: insets.bottom + 24 }}
                    onRefresh={load}
                    refreshing={false}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            {error ? (
                                <>
                                    <Text style={styles.emptyTitle}>Something went wrong</Text>
                                    <Text style={styles.emptySub}>{error}</Text>
                                    <Pressable style={styles.retry} onPress={load}>
                                        <Text style={styles.retryText}>Try again</Text>
                                    </Pressable>
                                </>
                            ) : (
                                <>
                                    <ImageOff size={26} color={colors.mutedForeground} />
                                    <Text style={styles.emptyTitle}>No offers right now</Text>
                                    <Text style={styles.emptySub}>
                                        {type === 'food' ? 'Food' : 'Grocery'} offers will show up here as soon as they're live.
                                    </Text>
                                </>
                            )}
                        </View>
                    }
                    renderItem={({ item }) => (
                        <Pressable
                            style={styles.card}
                            onPress={() => router.push({ pathname: '/banner-detail', params: { id: item._id } })}
                            accessibilityRole="button"
                            accessibilityLabel={`Open ${item.title}`}
                        >
                            {item.imageUrl ? (
                                <Image source={{ uri: item.imageUrl }} style={styles.img} resizeMode="cover" />
                            ) : (
                                <View style={[styles.img, styles.imgPlaceholder]} />
                            )}
                            <View style={styles.overlay} />
                            <View style={styles.body}>
                                <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                                {item.description ? (
                                    <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
                                ) : null}
                                <View style={styles.metaRow}>
                                    <View style={styles.metaChip}>
                                        <MapPin size={11} color={colors.primaryForeground} />
                                        <Text style={styles.metaText} numberOfLines={1}>
                                            {item.address || 'Tap to see location'}
                                        </Text>
                                    </View>
                                    <ChevronRight size={16} color={colors.primaryForeground} />
                                </View>
                            </View>
                        </Pressable>
                    )}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    card: {
        height: 132, borderRadius: radius.md, overflow: 'hidden',
        backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    },
    img: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
    imgPlaceholder: { backgroundColor: colors.chipBg },
    overlay: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.34)',
    },
    body: { position: 'absolute', left: 12, right: 12, bottom: 12 },
    title: { fontSize: 16, fontFamily: fonts.displayBold, color: '#FFFFFF' },
    desc: { fontSize: 11, fontFamily: fonts.body, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
    metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
    metaChip: {
        flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '85%',
        backgroundColor: 'rgba(0,0,0,0.32)', paddingHorizontal: 8, paddingVertical: 4,
        borderRadius: radius.pill,
    },
    metaText: { fontSize: 10, fontFamily: fonts.bodyBold, color: colors.primaryForeground, flexShrink: 1 },
    empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 64, gap: 6, paddingHorizontal: 24 },
    emptyTitle: { fontSize: 15, fontFamily: fonts.displayBold, color: colors.foreground, marginTop: 6 },
    emptySub: { fontSize: 12, fontFamily: fonts.body, color: colors.mutedForeground, textAlign: 'center' },
    retry: {
        marginTop: 8, paddingHorizontal: 16, paddingVertical: 9, borderRadius: radius.pill,
        backgroundColor: colors.primary,
    },
    retryText: { color: colors.primaryForeground, fontSize: 12, fontFamily: fonts.bodyBold },
});
