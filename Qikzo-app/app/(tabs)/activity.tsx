import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import {
    Package, ShoppingCart, UtensilsCrossed, Pill, Sparkles,
    Search, Bike, MapPin, CheckCircle2, XCircle, LucideIcon,
} from 'lucide-react-native';
import { colors, fonts, radius } from '@/lib/theme';
import ScreenHeader from '@/components/ScreenHeader';
import Button from '@/components/Button';
import AnimatedIcon from '@/components/AnimatedIcon';
import Skeleton, { SkeletonRow } from '@/components/Skeleton';
import { useInitialLoad } from '@/lib/useInitialLoad';
import { useBooking } from '@/lib/bookingStore';
import { categories, Booking, BookingStatus } from '@/lib/mockData';


const STATUS_COLOR: Record<BookingStatus, string> = {
    'Searching rider': colors.warning,
    'Rider accepted': colors.accent,
    'Arriving for pickup': colors.accent,
    'Picked up': colors.accent,
    'On the way': colors.accent,
    'Delivered': colors.success,
    'Cancelled': colors.danger,
};

const CATEGORY_ICON: Record<string, LucideIcon> = {
    groceries: ShoppingCart,
    food: UtensilsCrossed,
    medicines: Pill,
    parcel: Package,
    other: Sparkles,
    bike: Bike,
};

// Status currently in motion → show an animated icon overlay.
const ACTIVE_STATUSES: BookingStatus[] = [
    'Searching rider', 'Rider accepted', 'Arriving for pickup', 'Picked up', 'On the way',
];

function StatusGlyph({ status, size = 11 }: { status: BookingStatus; size?: number }) {
    if (status === 'Delivered') return <CheckCircle2 size={size} color={colors.success} strokeWidth={2.4} />;
    if (status === 'Cancelled') return <XCircle size={size} color={colors.danger} strokeWidth={2.4} />;
    if (status === 'Searching rider') return <AnimatedIcon Icon={Search} size={size} color={colors.warning} variant="spin" strokeWidth={2.4} />;
    return <AnimatedIcon Icon={Bike} size={size} color={colors.accent} variant="bounce" strokeWidth={2.4} />;
}

function fmtTime(ts: number) {
    const d = new Date(ts);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    const t = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
    if (isToday) return `Today, ${t}`;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) + ', ' + t;
}

export default function ActivityScreen() {
    const bookings = useBooking((s) => s.bookings);
    const hydrateFromServer = useBooking((s) => s.hydrateFromServer);
    const storeLoading = useBooking((s) => s.loading);
    const [refreshing, setRefreshing] = useState(false);
    const initialLoading = useInitialLoad();

    // Pull from server on mount so activity reflects real bookings, not just the
    // local mock seed. The store is a no-op when the user isn't signed in.
    useEffect(() => { hydrateFromServer(); }, [hydrateFromServer]);

    const onRefresh = async () => {
        setRefreshing(true);
        try { await hydrateFromServer(); } finally { setRefreshing(false); }
    };

    const loading = initialLoading || (storeLoading && bookings.length === 0);

    // Only the latest 8 bookings — activity is a quick recent-history glance,
    // not a full archive. Newest first (store already sorts by createdAt).
    const recent = React.useMemo(
        () => [...bookings].sort((a, b) => b.createdAt - a.createdAt).slice(0, 8),
        [bookings]
    );

    const renderItem = useCallback(({ item }: { item: Booking }) => (
        <ActivityRow item={item} />
    ), []);

    const keyExtractor = useCallback((b: Booking) => b.id, []);
    const getItemLayout = useCallback((_: any, index: number) => ({
        length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index,
    }), []);

    if (loading) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="Activity" showBack={false} />
                <View style={{ paddingTop: 4 }}>
                    {[0, 1, 2, 3, 4, 5].map((i) => <SkeletonRow key={i} />)}
                </View>
            </View>
        );
    }


    if (bookings.length === 0) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="Activity" showBack={false} />
                <View style={styles.empty}>
                    <View style={styles.emptyIconWrap}>
                        <AnimatedIcon Icon={Package} size={44} color={colors.foreground} variant="bounce" strokeWidth={1.4} />
                    </View>
                    <Text style={styles.emptyTitle}>No bookings yet</Text>
                    <Text style={styles.emptySub}>Your trips and delivery history will appear here.</Text>
                    <Button label="Book a delivery" onPress={() => router.push('/book-delivery')} style={{ marginTop: 16, paddingHorizontal: 20 }} />
                </View>
            </View>
        );
    }


    return (
        <View style={styles.container}>
            <ScreenHeader title="Activity" showBack={false} />
            <FlatList
                data={recent}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                getItemLayout={getItemLayout}
                initialNumToRender={8}
                maxToRenderPerBatch={8}
                windowSize={7}
                removeClippedSubviews
                updateCellsBatchingPeriod={40}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 24 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            />
        </View>
    );
}

// Fixed approximate row height so FlatList can compute offsets without
// measuring — massive speed-up when the list is long or updates often.
const ROW_HEIGHT = 76;

// Memoised row so unchanged rows never re-render when the parent list updates.
const ActivityRow = React.memo(function ActivityRow({ item }: { item: Booking }) {
    const cat = categories.find((c) => c.id === item.categoryId);
    const CatIcon = CATEGORY_ICON[item.categoryId] || Package;
    const isActive = ACTIVE_STATUSES.includes(item.status);
    return (
        <Pressable
            style={styles.row}
            onPress={() => router.push({ pathname: '/booking-details', params: { id: item.id } })}
        >
            <View style={styles.iconBox}>
                {isActive ? (
                    <AnimatedIcon Icon={CatIcon} size={18} color={colors.foreground} variant="ping" ringColor={colors.accent} />
                ) : (
                    <CatIcon size={18} color={colors.foreground} strokeWidth={1.8} />
                )}
            </View>
            <View style={styles.info}>
                <Text style={styles.id}>#{item.id} · {cat?.name || 'Delivery'}</Text>
                <Text style={styles.route} numberOfLines={1}>
                    {item.pickup} → {item.drop}
                </Text>
                <View style={styles.metaRow}>
                    <MapPin size={10} color={colors.mutedForeground} />
                    <Text style={styles.meta}>{item.distanceKm.toFixed(1)} km · {fmtTime(item.createdAt)}</Text>
                </View>
            </View>
            <View style={styles.right}>
                <Text style={styles.price}>₹{item.price}</Text>
                <View style={[styles.statusPill, { borderColor: STATUS_COLOR[item.status] }]}>
                    <StatusGlyph status={item.status} />
                    <Text style={[styles.status, { color: STATUS_COLOR[item.status] }]}>{item.status}</Text>
                </View>
            </View>
        </Pressable>
    );
});

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 6 },
    emptyIconWrap: {
        width: 72, height: 72, borderWidth: 1, borderColor: colors.border,
        alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg, marginBottom: 6,
    },
    emptyTitle: { fontSize: 16, fontFamily: fonts.displayBold, color: colors.foreground, marginTop: 8 },
    emptySub: { fontSize: 13, color: colors.mutedForeground, fontFamily: fonts.body, textAlign: 'center' },
    row: {
        flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, paddingHorizontal: 6,
        borderBottomWidth: 1, borderBottomColor: colors.divider,
        height: 76, // must match ROW_HEIGHT — powers FlatList getItemLayout.
    },
    iconBox: {
        width: 40, height: 40, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
        alignItems: 'center', justifyContent: 'center', borderRadius: radius.md,
    },
    info: { flex: 1, marginLeft: 8, gap: 2 },
    id: { fontSize: 11, color: colors.mutedForeground, fontFamily: fonts.bodyBold, letterSpacing: 0.3 },
    route: { fontSize: 13, fontFamily: fonts.bodyBold, color: colors.foreground },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    meta: { fontSize: 11, color: colors.mutedForeground, fontFamily: fonts.body },
    right: { alignItems: 'flex-end', gap: 4 },
    price: { fontSize: 15, fontFamily: fonts.displayBold, color: colors.foreground },
    statusPill: {
        flexDirection: 'row', alignItems: 'center', gap: 3,
        borderWidth: 1, paddingHorizontal: 5, paddingVertical: 2, borderRadius: radius.sm,
    },
    status: { fontSize: 9, fontFamily: fonts.bodyBold },
});

// activity