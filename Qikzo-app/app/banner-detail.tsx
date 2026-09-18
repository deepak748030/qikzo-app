import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import { MapPin, Star } from 'lucide-react-native';
import { colors, fonts, radius } from '@/lib/theme';
import ScreenHeader from '@/components/ScreenHeader';
import Button from '@/components/Button';
import BottomSheet from '@/components/BottomSheet';
import Skeleton from '@/components/Skeleton';
import DetailTabBar, { type DetailTab } from '@/components/DetailTabBar';
import { useSheet } from '@/lib/useSheet';
import { useBooking } from '@/lib/bookingStore';
import { useServiceMode } from '@/lib/serviceMode';
import { ApiError } from '@/lib/api/errors';
import {
    categoryBannersApi,
    type BannerReviews,
    type CategoryBanner,
} from '@/lib/api/endpoints/categoryBanners';

function paramStr(v?: string | string[]): string {
    if (Array.isArray(v)) return String(v[0] || '');
    return v ? String(v) : '';
}

/**
 * Banner detail — the screen a Food/Grocery banner opens.
 *
 *   Details tab : the banner itself — image, title, description and the
 *                 pickup location attached to it.
 *   Rating tab  : reviews rolled up for that category from the existing
 *                 OrderReview collection.
 *
 * This screen does NOT book. Its single action drops the banner's coordinate
 * into the booking draft as the pickup location and hands over to the
 * existing /book-delivery screen, where the customer books exactly as they
 * always have. `replace` (not `push`) keeps the stack Home → banner list →
 * booking, so Back from the booking screen returns to the banner list.
 */
export default function BannerDetailScreen() {
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{ id?: string | string[] }>();
    const id = paramStr(params.id);

    const [tab, setTab] = useState<DetailTab>('details');
    const [banner, setBanner] = useState<CategoryBanner | null>(null);
    const [reviews, setReviews] = useState<BannerReviews | null>(null);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [loading, setLoading] = useState(true);
    const sheet = useSheet();

    const setDraft = useBooking((s) => s.setDraft);
    const setMode = useServiceMode((s) => s.setMode);

    useFocusEffect(useCallback(() => {
        if (!id) return;
        let alive = true;
        setLoading(true);
        categoryBannersApi
            .detail(id)
            .then((d) => { if (alive) setBanner(d.banner); })
            .catch((e) => {
                if (!alive) return;
                sheet.show({
                    variant: 'error',
                    title: 'Could not open this offer',
                    message: e instanceof ApiError ? e.message : 'Please go back and try another banner.',
                });
                router.back();
            })
            .finally(() => { if (alive) setLoading(false); });
        return () => { alive = false; };
    }, [id]));

    // Reviews load the first time the Rating tab is opened.
    useEffect(() => {
        if (tab !== 'rating' || reviews || !id) return;
        let alive = true;
        setReviewsLoading(true);
        categoryBannersApi
            .reviews(id)
            .then((r) => { if (alive) setReviews(r); })
            .catch(() => { if (alive) setReviews({ summary: { avg: 0, count: 0 }, items: [] }); })
            .finally(() => { if (alive) setReviewsLoading(false); });
        return () => { alive = false; };
    }, [tab, reviews, id]);

    /** Banner coordinate → pickup location, then the existing booking screen. */
    const setAsPickup = () => {
        if (!banner) return;
        if (!banner.coord || !Number.isFinite(banner.coord.lat) || !Number.isFinite(banner.coord.lng)) {
            sheet.show({
                variant: 'error',
                title: 'No pickup location',
                message: 'This banner has no location attached yet.',
            });
            return;
        }
        setMode('delivery');
        setDraft({
            mode: 'delivery',
            categoryId: banner.type === 'grocery' ? 'groceries' : 'food',
            pickup: banner.address?.trim() || banner.title,
            pickupCoord: { lat: banner.coord.lat, lng: banner.coord.lng },
        });
        router.replace('/book-delivery');
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="Offer" />
                <View style={{ padding: 6, gap: 8, marginTop: 10 }}>
                    <Skeleton height={160} rounded="md" />
                    <Skeleton height={16} width="60%" />
                    <Skeleton height={80} rounded="md" />
                </View>
            </View>
        );
    }

    const summary = reviews?.summary || { avg: 0, count: 0 };

    return (
        <View style={styles.container}>
            <ScreenHeader title={banner?.title || 'Offer'} />

            <View style={styles.tabWrap}>
                <DetailTabBar value={tab} onChange={setTab} />
            </View>

            {tab === 'details' ? (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ padding: 6, gap: 10, paddingBottom: insets.bottom + 150 }}
                >
                    {banner?.imageUrl ? (
                        <View style={styles.hero}>
                            <Image source={{ uri: banner.imageUrl }} style={styles.heroImg} resizeMode="cover" />
                            <View style={styles.heroOverlay} />
                            <View style={styles.heroBody}>
                                <Text style={styles.heroTitle} numberOfLines={2}>{banner.title}</Text>
                            </View>
                        </View>
                    ) : null}

                    {banner?.description ? (
                        <View style={styles.card}>
                            <Text style={styles.blockLabel}>About this offer</Text>
                            <Text style={styles.bodyText}>{banner.description}</Text>
                        </View>
                    ) : null}

                    <View style={styles.card}>
                        <Text style={styles.blockLabel}>Pickup location</Text>
                        <View style={styles.infoRow}>
                            <MapPin size={14} color={colors.primary} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.locationText}>
                                    {banner?.address?.trim() || banner?.title || 'Location not set'}
                                </Text>
                                {banner?.coord ? (
                                    <Text style={styles.coordText}>
                                        {banner.coord.lat.toFixed(5)}, {banner.coord.lng.toFixed(5)}
                                    </Text>
                                ) : null}
                            </View>
                        </View>
                        <Text style={styles.hint}>
                            This point is added to your pickup location when you continue.
                        </Text>
                    </View>
                </ScrollView>
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ padding: 6, gap: 10, paddingBottom: insets.bottom + 24 }}
                >
                    <View style={styles.card}>
                        <Text style={styles.blockLabel}>Rating</Text>
                        <View style={styles.ratingBigRow}>
                            <Text style={styles.ratingBig}>{summary.count ? summary.avg.toFixed(1) : '—'}</Text>
                            <View style={styles.starsRow}>
                                {[1, 2, 3, 4, 5].map((n) => (
                                    <Star
                                        key={n}
                                        size={16}
                                        color={colors.accent}
                                        fill={summary.avg >= n - 0.25 ? colors.accent : 'transparent'}
                                    />
                                ))}
                            </View>
                        </View>
                        <Text style={styles.ratingSub}>
                            {summary.count
                                ? `${summary.count} review${summary.count === 1 ? '' : 's'} for ${banner?.type === 'grocery' ? 'grocery' : 'food'} orders`
                                : 'No reviews yet'}
                        </Text>
                    </View>

                    {reviewsLoading ? (
                        <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                            <Skeleton width={120} height={14} />
                        </View>
                    ) : (reviews?.items?.length ?? 0) === 0 ? (
                        <View style={styles.emptyBox}>
                            <Star size={24} color={colors.mutedForeground} />
                            <Text style={styles.emptyTitle}>No reviews yet</Text>
                            <Text style={styles.emptySub}>
                                Reviews appear here after {banner?.type === 'grocery' ? 'grocery' : 'food'} orders are delivered.
                            </Text>
                        </View>
                    ) : (
                        reviews!.items.map((r) => (
                            <View key={r._id} style={styles.reviewCard}>
                                <View style={styles.reviewHead}>
                                    <View style={styles.starsRow}>
                                        {[1, 2, 3, 4, 5].map((n) => (
                                            <Star key={n} size={12} color={colors.accent} fill={r.stars >= n ? colors.accent : 'transparent'} />
                                        ))}
                                    </View>
                                    <Text style={styles.reviewName} numberOfLines={1}>{r.userName}</Text>
                                </View>
                                {r.comment ? <Text style={styles.reviewComment}>{r.comment}</Text> : null}
                                <Text style={styles.reviewMeta}>
                                    {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                </Text>
                            </View>
                        ))
                    )}
                </ScrollView>
            )}

            {tab === 'details' ? (
                <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
                    <Text style={styles.footerMeta} numberOfLines={1}>
                        {banner?.address?.trim() || banner?.title || 'Pickup location'}
                    </Text>
                    <Button label="Set as pickup" onPress={setAsPickup} disabled={!banner} />
                </View>
            ) : null}

            <BottomSheet visible={sheet.visible} {...sheet.config} onClose={sheet.hide} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    tabWrap: { paddingHorizontal: 6, paddingTop: 8, paddingBottom: 2 },

    hero: { height: 160, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.card },
    heroImg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
    heroOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.34)' },
    heroBody: { position: 'absolute', left: 12, right: 12, bottom: 12 },
    heroTitle: { fontSize: 18, fontFamily: fonts.displayBold, color: '#FFFFFF' },

    card: {
        backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
        borderRadius: radius.md, padding: 12, gap: 8,
    },
    blockLabel: {
        fontSize: 11, fontFamily: fonts.bodyBold, color: colors.mutedForeground,
        letterSpacing: 0.6, textTransform: 'uppercase',
    },
    bodyText: { fontSize: 12, fontFamily: fonts.body, color: colors.foreground, lineHeight: 18 },
    infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    locationText: { fontSize: 13, fontFamily: fonts.bodyBold, color: colors.foreground },
    coordText: { fontSize: 10, fontFamily: fonts.body, color: colors.mutedForeground, marginTop: 2 },
    hint: { fontSize: 10, fontFamily: fonts.body, color: colors.mutedForeground },

    ratingBigRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    ratingBig: { fontSize: 30, fontFamily: fonts.displayBold, color: colors.foreground },
    starsRow: { flexDirection: 'row', gap: 2 },
    ratingSub: { fontSize: 11, fontFamily: fonts.body, color: colors.mutedForeground },

    reviewCard: {
        backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
        borderRadius: radius.md, padding: 12, gap: 6,
    },
    reviewHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    reviewName: { fontSize: 11, fontFamily: fonts.bodyBold, color: colors.mutedForeground },
    reviewComment: { fontSize: 12, fontFamily: fonts.body, color: colors.foreground, lineHeight: 18 },
    reviewMeta: { fontSize: 10, fontFamily: fonts.body, color: colors.mutedForeground },

    emptyBox: {
        alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 36,
        paddingHorizontal: 24, backgroundColor: colors.card, borderWidth: 1,
        borderColor: colors.border, borderRadius: radius.md,
    },
    emptyTitle: { fontSize: 13, fontFamily: fonts.displayBold, color: colors.foreground, marginTop: 4 },
    emptySub: { fontSize: 11, fontFamily: fonts.body, color: colors.mutedForeground, textAlign: 'center' },

    footer: {
        position: 'absolute', left: 0, right: 0, bottom: 0,
        backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border,
        paddingHorizontal: 6, paddingTop: 8, gap: 6,
    },
    footerMeta: {
        fontSize: 10, fontFamily: fonts.body, color: colors.mutedForeground, textAlign: 'center',
    },
});
