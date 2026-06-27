import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { router } from 'expo-router';
import {
    Package, ShoppingCart, UtensilsCrossed, Pill, Sparkles,
    Search, Bike, MapPin, CheckCircle2, XCircle, LucideIcon,
} from 'lucide-react-native';
import { colors, fonts, radius } from '@/lib/theme';
import ScreenHeader from '@/components/ScreenHeader';
import Button from '@/components/Button';
import AnimatedIcon from '@/components/AnimatedIcon';
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

    const renderItem = ({ item }: { item: Booking }) => {
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
    };

    return (
        <View style={styles.container}>
            <ScreenHeader title="Activity" showBack={false} />
            <FlatList
                data={bookings}
                keyExtractor={(b) => b.id}
                renderItem={renderItem}
                ItemSeparatorComponent={() => <View style={{ height: 0 }} />}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 24 }}
            />
        </View>
    );
}

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
