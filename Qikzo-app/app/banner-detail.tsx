import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, Image, Pressable, Modal, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import {
    MapPin, Home as HomeIcon, ChevronRight, Star, Clock, Tag, X, Maximize2,
    UtensilsCrossed, Store as StoreIcon, CheckCircle2,
} from 'lucide-react-native';
import { colors, fonts, radius } from '@/lib/theme';
import ScreenHeader from '@/components/ScreenHeader';
import Button from '@/components/Button';
import BottomSheet from '@/components/BottomSheet';
import Skeleton from '@/components/Skeleton';
import DetailTabBar, { type DetailTab } from '@/components/DetailTabBar';
import StoreInputList from '@/components/StoreInputList';
import { useSheet } from '@/lib/useSheet';
import { useBooking } from '@/lib/bookingStore';
import { useBannerFlow, composeNotes } from '@/lib/bannerFlowStore';
import { tokenStore } from '@/lib/api/tokenStore';
import { ApiError } from '@/lib/api/errors';
import {
    categoryBannersApi,
    type BannerStore,
    type BannerReviews,
    type CategoryBannerDetail,
} from '@/lib/api/endpoints/categoryBanners';

function paramStr(v?: string | string[]): string {
    if (Array.isArray(v)) return String(v[0] || '');
    return v ? String(v) : '';
}

/**
 * Banner detail — the screen a Food/Grocery banner opens.
 *
 *   Details tab : merchant info, menu, offers  +  pickup / drop  +  one input
 *                 box per merchant  +  [ BOOK ]
 *   Rating tab  : rolled-up stars and the customers' reviews
 *
 * Pickup and drop reuse the existing /select-location screen. It is opened
 * *without* a bannerId on purpose: with one, that screen treats the trip as a
 * home-carousel banner pickup and router.replace()s into /book-delivery, which
 * would drop the customer out of this flow.
 */
export default function BannerDetailScreen() {
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{ id?: string | string[] }>();
    const id = paramStr(params.id);

    const [tab, setTab] = useState<DetailTab>('details');
    const [detail, setDetail] = useState<CategoryBannerDetail | null>(null);
    const [reviews, setReviews] = useState<BannerReviews | null>(null);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [menuPreview, setMenuPreview] = useState<{ title: string; imageUrl: string } | null>(null);
    const sheet = useSheet();

    const draft = useBooking((s) => s.draft);
    const createOnServer = useBooking((s) => s.createOnServer);
    const resetDraft = useBooking((s) => s.resetDraft);
    const banner = useBannerFlow((s) => s.banner);
    const setBanner = useBannerFlow((s) => s.setBanner);
    const filledInputs = useBannerFlow((s) => s.filledInputs);
    const resetFlow = useBannerFlow((s) => s.reset);

    const stores: BannerStore[] = useMemo(() => detail?.stores || [], [detail]);
    const pickupSet = !!draft.pickup.trim();
    const dropSet = !!draft.drop.trim();

    // Coming back from /select-location should refresh the pickup/drop rows.
    useFocusEffect(useCallback(() => {
        if (!id) return;
        let alive = true;
        setLoading(true);
        categoryBannersApi
            .detail(id)
            .then((d) => {
                if (!alive) return;
                setDetail(d);
                if (!banner || banner.id !== d.banner._id) {
                    setBanner({ id: d.banner._id, title: d.banner.title, type: d.banner.type });
                }
            })
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

    /** Pre-fill from the first merchant that has coordinates, when possible. */
    const openPickup = () => {
        const seeded = stores.find((s) => s.coord);
        router.push({
            pathname: '/select-location',
            params: seeded
                ? {
                    field: 'pickup',
                    lat: String(seeded.coord!.lat),
                    lng: String(seeded.coord!.lng),
                    address: seeded.address || seeded.name,
                }
                : { field: 'pickup' },
        });
    };

    const openDrop = () => router.push({ pathname: '/select-location', params: { field: 'drop' } });

    const book = async () => {
        if (busy) return;
        if (!tokenStore.get().accessToken) {
            sheet.show({
                variant: 'error',
                title: 'Sign in required',
                message: 'Please sign in to place this order.',
                confirmText: 'Sign in',
                onConfirm: () => router.push('/login'),
            });
            return;
        }
        if (!pickupSet) {
            sheet.show({ variant: 'error', title: 'Pickup location required', message: 'Choose where the rider should collect from.' });
            return;
        }
        if (!dropSet) {
            sheet.show({ variant: 'error', title: 'Delivery address required', message: 'Choose where this should be delivered.' });
            return;
        }
        const inputs = filledInputs();
        if (!inputs.length) {
            sheet.show({ variant: 'error', title: 'Add your order', message: 'Fill in at least one store to continue.' });
            return;
        }

        setBusy(true);
        try {
            const created = await createOnServer({
                mode: 'delivery',
                categoryId: (banner?.type === 'grocery' ? 'groceries' : 'food'),
                pickup: {
                    address: draft.pickup.trim(),
                    lat: draft.pickupCoord?.lat ?? null,
                    lng: draft.pickupCoord?.lng ?? null,
                },
                drop: {
                    address: draft.drop.trim(),
                    lat: draft.dropCoord?.lat ?? null,
                    lng: draft.dropCoord?.lng ?? null,
                },
                // The rider app only reads `notes`, so the per-store text is
                // composed there too; `storeInputs` travels alongside it.
                notes: composeNotes(inputs),
                payment: draft.payment,
                bannerId: id,
                storeInputs: inputs,
            } as any);
            resetFlow();
            resetDraft();
            router.replace({ pathname: '/booking-details', params: { id: created.id } });
        } catch (e) {
            const msg = e instanceof ApiError ? e.message : 'Could not place the order. Please try again.';
            sheet.show({ variant: 'error', title: 'Booking failed', message: msg });
        } finally {
            setBusy(false);
        }
    };

    const summary = reviews?.summary;
    const overall = summary && summary.count > 0
        ? summary
        : (() => {
            const rated = stores.filter((s) => s.rating?.count > 0);
            if (!rated.length) return { avg: 0, count: 0 };
            const count = rated.reduce((n, s) => n + s.rating.count, 0);
            const avg = rated.reduce((n, s) => n + s.rating.avg * s.rating.count, 0) / count;
            return { avg: Math.round(avg * 10) / 10, count };
        })();

    if (loading) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="Offer" />
                <View style={{ padding: 6, gap: 8, marginTop: 10 }}>
                    <Skeleton height={150} rounded="md" />
                    <Skeleton height={16} width="60%" />
                    <Skeleton height={90} rounded="md" />
                    <Skeleton height={90} rounded="md" />
                </View>
            </View>
        );
    }

    const b = detail?.banner;

    return (
        <View style={styles.container}>
            <ScreenHeader title={b?.title || 'Offer'} />

            <View style={styles.tabWrap}>
                <DetailTabBar value={tab} onChange={setTab} />
            </View>

            {tab === 'details' ? (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ padding: 6, gap: 10, paddingBottom: insets.bottom + 150 }}
                >
                    {/* Banner hero */}
                    {b?.imageUrl ? (
                        <View style={styles.hero}>
                            <Image source={{ uri: b.imageUrl }} style={styles.heroImg} resizeMode="cover" />
                            <View style={styles.heroOverlay} />
                            <View style={styles.heroBody}>
                                <Text style={styles.heroTitle} numberOfLines={2}>{b.title}</Text>
                                {b.description ? <Text style={styles.heroDesc} numberOfLines={3}>{b.description}</Text> : null}
                            </View>
                        </View>
                    ) : null}

                    {stores.length === 0 ? (
                        <View style={styles.emptyBox}>
                            <Text style={styles.emptyTitle}>Nothing available here yet</Text>
                            <Text style={styles.emptySub}>This offer has no merchants attached right now.</Text>
                        </View>
                    ) : stores.map((s) => (
                        <View key={s._id} style={styles.storeCard}>
                            <View style={styles.storeHead}>
                                <View style={styles.storeIcon}>
                                    {s.kind === 'store'
                                        ? <StoreIcon size={15} color={colors.primary} strokeWidth={2} />
                                        : <UtensilsCrossed size={15} color={colors.primary} strokeWidth={2} />}
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.storeName} numberOfLines={1}>{s.name}</Text>
                                    {s.description ? (
                                        <Text style={styles.storeDesc} numberOfLines={2}>{s.description}</Text>
                                    ) : null}
                                </View>
                                {s.rating?.count > 0 ? (
                                    <View style={styles.ratingPill}>
                                        <Star size={11} color={colors.accent} fill={colors.accent} />
                                        <Text style={styles.ratingText}>{s.rating.avg.toFixed(1)}</Text>
                                        <Text style={styles.ratingCount}>({s.rating.count})</Text>
                                    </View>
                                ) : null}
                            </View>

                            {s.address ? (
                                <View style={styles.infoRow}>
                                    <MapPin size={13} color={colors.mutedForeground} />
                                    <Text style={styles.infoText}>{s.address}</Text>
                                </View>
                            ) : null}

                            {s.hours?.length ? (
                                <View style={styles.infoRow}>
                                    <Clock size={13} color={colors.mutedForeground} />
                                    <Text style={styles.infoText}>
                                        {s.hours.map((h) => `${h.day} · ${h.open}–${h.close}`).join('  |  ')}
                                    </Text>
                                </View>
                            ) : null}

                            {s.offers?.length ? (
                                <View style={styles.offersWrap}>
                                    {s.offers.map((o, i) => (
                                        <View key={i} style={styles.offerChip}>
                                            <Tag size={11} color={colors.primary} />
                                            <Text style={styles.offerTitle}>{o.title}</Text>
                                            {o.detail ? <Text style={styles.offerDetail}> · {o.detail}</Text> : null}
                                        </View>
                                    ))}
                                </View>
                            ) : null}

                            {/* Menu — image, item list, or an explicit empty state */}
                            <View style={styles.menuBlock}>
                                <Text style={styles.blockLabel}>Menu</Text>
                                {s.menu?.items?.length ? (
                                    <View style={styles.menuItems}>
                                        {s.menu.items.map((it, i) => (
                                            <View key={i} style={styles.menuItem}>
                                                <View style={[styles.vegDot, { borderColor: it.veg === false ? colors.danger : colors.success }]}>
                                                    <View style={[styles.vegDotInner, { backgroundColor: it.veg === false ? colors.danger : colors.success }]} />
                                                </View>
                                                <Text style={styles.menuItemName} numberOfLines={1}>{it.name}</Text>
                                                {it.category ? <Text style={styles.menuItemCat} numberOfLines={1}>{it.category}</Text> : null}
                                                <Text style={styles.menuItemPrice}>
                                                    {it.price == null ? '—' : `₹${it.price}`}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                ) : null}

                                {s.menu?.imageUrl ? (
                                    <Pressable
                                        style={styles.menuImageCard}
                                        onPress={() => setMenuPreview({ title: s.name, imageUrl: s.menu.imageUrl! })}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Open menu for ${s.name}`}
                                    >
                                        <Image source={{ uri: s.menu.imageUrl }} style={styles.menuThumb} resizeMode="contain" />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.menuImageTitle} numberOfLines={1}>View full menu</Text>
                                            <Text style={styles.menuImageMeta}>Tap to open the menu photo</Text>
                                        </View>
                                        <Maximize2 size={16} color={colors.mutedForeground} />
                                    </Pressable>
                                ) : null}

                                {!s.menu?.items?.length && !s.menu?.imageUrl ? (
                                    <Text style={styles.menuEmpty}>Menu not available</Text>
                                ) : null}
                            </View>
                        </View>
                    ))}

                    {/* Pickup / drop — existing map screen, no bannerId */}
                    <View style={styles.tripCard}>
                        <Pressable style={styles.tripRow} onPress={openPickup}>
                            <View style={[styles.tripDot, { backgroundColor: colors.primary }]}>
                                <MapPin size={13} color="#FFFFFF" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.tripLabel}>Pickup location</Text>
                                <Text style={[styles.tripValue, !pickupSet && styles.tripPlaceholder]} numberOfLines={2}>
                                    {draft.pickup || 'Tap to select on the map'}
                                </Text>
                            </View>
                            {pickupSet ? <CheckCircle2 size={16} color={colors.success} /> : <ChevronRight size={16} color={colors.mutedForeground} />}
                        </Pressable>

                        <View style={styles.tripDivider} />

                        <Pressable style={styles.tripRow} onPress={openDrop}>
                            <View style={[styles.tripDot, { backgroundColor: colors.foreground }]}>
                                <HomeIcon size={13} color="#FFFFFF" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.tripLabel}>Deliver to</Text>
                                <Text style={[styles.tripValue, !dropSet && styles.tripPlaceholder]} numberOfLines={2}>
                                    {draft.drop || 'Tap to select on the map'}
                                </Text>
                            </View>
                            {dropSet ? <CheckCircle2 size={16} color={colors.success} /> : <ChevronRight size={16} color={colors.mutedForeground} />}
                        </Pressable>
                    </View>

                    {/* One input per merchant */}
                    {stores.length > 0 ? (
                        <View style={styles.inputsCard}>
                            <Text style={styles.blockLabel}>Your order</Text>
                            <StoreInputList stores={stores} />
                        </View>
                    ) : null}
                </ScrollView>
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ padding: 6, gap: 10, paddingBottom: insets.bottom + 24 }}
                >
                    <View style={styles.ratingCard}>
                        <Text style={styles.blockLabel}>Rating</Text>
                        <View style={styles.ratingBigRow}>
                            <Text style={styles.ratingBig}>{overall.count ? overall.avg.toFixed(1) : '—'}</Text>
                            <View style={styles.starsRow}>
                                {[1, 2, 3, 4, 5].map((n) => (
                                    <Star
                                        key={n}
                                        size={16}
                                        color={colors.accent}
                                        fill={overall.avg >= n - 0.25 ? colors.accent : 'transparent'}
                                    />
                                ))}
                            </View>
                        </View>
                        <Text style={styles.ratingSub}>
                            {overall.count ? `${overall.count} review${overall.count === 1 ? '' : 's'}` : 'No reviews yet'}
                        </Text>
                    </View>

                    {reviewsLoading ? (
                        <ActivityIndicator style={{ marginVertical: 24 }} color={colors.primary} />
                    ) : (reviews?.items?.length ?? 0) === 0 ? (
                        <View style={styles.emptyBox}>
                            <Star size={24} color={colors.mutedForeground} />
                            <Text style={styles.emptyTitle}>No reviews yet</Text>
                            <Text style={styles.emptySub}>Be the first to rate this after your order is delivered.</Text>
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
                                <View style={styles.reviewMetaRow}>
                                    {r.storeName ? <Text style={styles.reviewMeta}>{r.storeName}</Text> : null}
                                    <Text style={styles.reviewMeta}>
                                        {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                    </Text>
                                </View>
                            </View>
                        ))
                    )}
                </ScrollView>
            )}

            {/* Sticky BOOK — only on the Details tab */}
            {tab === 'details' ? (
                <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
                    <View style={styles.footerMeta}>
                        <Text style={styles.footerMetaText} numberOfLines={1}>
                            {pickupSet && dropSet
                                ? `${filledInputs().length || 0} store${filledInputs().length === 1 ? '' : 's'} with an order`
                                : pickupSet ? 'Add a delivery address' : 'Select a pickup location'}
                        </Text>
                    </View>
                    <Button
                        label="Book"
                        onPress={book}
                        loading={busy}
                        disabled={stores.length === 0}
                    />
                </View>
            ) : null}

            {/* Full-screen menu photo */}
            <Modal visible={!!menuPreview} transparent animationType="fade" onRequestClose={() => setMenuPreview(null)}>
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHead}>
                            <Text style={styles.modalTitle} numberOfLines={1}>{menuPreview?.title}</Text>
                            <Pressable onPress={() => setMenuPreview(null)} hitSlop={10}>
                                <X size={20} color={colors.foreground} />
                            </Pressable>
                        </View>
                        {menuPreview ? (
                            <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
                                <Image source={{ uri: menuPreview.imageUrl }} style={styles.modalImg} resizeMode="contain" />
                            </ScrollView>
                        ) : null}
                    </View>
                </View>
            </Modal>

            <BottomSheet visible={sheet.visible} {...sheet.config} onClose={sheet.hide} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    tabWrap: { paddingHorizontal: 6, paddingTop: 8, paddingBottom: 2 },

    hero: { height: 150, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.card },
    heroImg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
    heroOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.38)' },
    heroBody: { position: 'absolute', left: 12, right: 12, bottom: 12 },
    heroTitle: { fontSize: 17, fontFamily: fonts.displayBold, color: '#FFFFFF' },
    heroDesc: { fontSize: 11, fontFamily: fonts.body, color: 'rgba(255,255,255,0.9)', marginTop: 3 },

    storeCard: {
        backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
        borderRadius: radius.md, padding: 12, gap: 8,
    },
    storeHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    storeIcon: {
        width: 32, height: 32, borderRadius: radius.sm, backgroundColor: colors.chipBg,
        borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
    },
    storeName: { fontSize: 14, fontFamily: fonts.displayBold, color: colors.foreground },
    storeDesc: { fontSize: 11, fontFamily: fonts.body, color: colors.mutedForeground, marginTop: 1 },
    ratingPill: {
        flexDirection: 'row', alignItems: 'center', gap: 3,
        backgroundColor: colors.chipBg, borderWidth: 1, borderColor: colors.border,
        paddingHorizontal: 7, paddingVertical: 3, borderRadius: radius.pill,
    },
    ratingText: { fontSize: 11, fontFamily: fonts.bodyBold, color: colors.foreground },
    ratingCount: { fontSize: 10, fontFamily: fonts.body, color: colors.mutedForeground },

    infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
    infoText: { flex: 1, fontSize: 11, fontFamily: fonts.body, color: colors.mutedForeground, lineHeight: 16 },

    offersWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    offerChip: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        borderWidth: 1, borderColor: colors.primary, borderRadius: radius.sm,
        paddingHorizontal: 8, paddingVertical: 4,
    },
    offerTitle: { fontSize: 10, fontFamily: fonts.bodyBold, color: colors.primary },
    offerDetail: { fontSize: 10, fontFamily: fonts.body, color: colors.mutedForeground },

    menuBlock: { gap: 6 },
    blockLabel: {
        fontSize: 11, fontFamily: fonts.bodyBold, color: colors.mutedForeground,
        letterSpacing: 0.6, textTransform: 'uppercase',
    },
    menuItems: { gap: 4 },
    menuItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    vegDot: { width: 12, height: 12, borderWidth: 1.2, alignItems: 'center', justifyContent: 'center' },
    vegDotInner: { width: 5, height: 5, borderRadius: 3 },
    menuItemName: { flex: 1, fontSize: 12, fontFamily: fonts.body, color: colors.foreground },
    menuItemCat: { fontSize: 10, fontFamily: fonts.body, color: colors.mutedForeground, maxWidth: 80 },
    menuItemPrice: { fontSize: 12, fontFamily: fonts.bodyBold, color: colors.foreground },
    menuEmpty: { fontSize: 11, fontFamily: fonts.body, color: colors.mutedForeground },
    menuImageCard: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
        padding: 8, backgroundColor: colors.inputBg,
    },
    menuThumb: { width: 44, height: 44, borderRadius: 6, backgroundColor: '#FFFFFF' },
    menuImageTitle: { fontSize: 12, fontFamily: fonts.bodyBold, color: colors.foreground },
    menuImageMeta: { fontSize: 10, fontFamily: fonts.body, color: colors.mutedForeground, marginTop: 1 },

    tripCard: {
        backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
        borderRadius: radius.md, overflow: 'hidden',
    },
    tripRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
    tripDot: { width: 26, height: 26, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
    tripLabel: { fontSize: 10, fontFamily: fonts.bodyBold, color: colors.mutedForeground, letterSpacing: 0.4, textTransform: 'uppercase' },
    tripValue: { fontSize: 12, fontFamily: fonts.body, color: colors.foreground, marginTop: 1 },
    tripPlaceholder: { color: colors.mutedForeground },
    tripDivider: { height: 1, backgroundColor: colors.divider, marginLeft: 48 },

    inputsCard: {
        backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
        borderRadius: radius.md, padding: 12, gap: 10,
    },

    ratingCard: {
        backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
        borderRadius: radius.md, padding: 12, gap: 4,
    },
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
    reviewMetaRow: { flexDirection: 'row', gap: 8 },
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
    footerMeta: { alignItems: 'center' },
    footerMetaText: { fontSize: 10, fontFamily: fonts.body, color: colors.mutedForeground },

    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 12 },
    modalCard: { backgroundColor: colors.card, borderRadius: radius.md, padding: 12, gap: 10 },
    modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    modalTitle: { flex: 1, fontSize: 14, fontFamily: fonts.displayBold, color: colors.foreground },
    modalImg: { width: '100%', height: 460 },
});
