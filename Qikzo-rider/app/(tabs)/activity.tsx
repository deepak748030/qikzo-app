import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Pressable } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Navigation2, ChevronRight } from 'lucide-react-native';
import { colors, fonts, radius } from '@/lib/theme';
import ScreenHeader from '@/components/ScreenHeader';
import Skeleton, { SkeletonRow } from '@/components/Skeleton';
import { SectionLabel, StatCol, StatDivider } from '@/components/ui';
import { useInitialLoad } from '@/lib/useInitialLoad';
import { CATEGORY_META, CompletedJob } from '@/lib/mockData';
import { useJobs } from '@/lib/jobStore';
import { useAuth } from '@/lib/authStore';
import { api } from '@/lib/api';
import type { EarningsSummary } from '@/lib/api/endpoints/earnings';

// Renders a single completed / cancelled job row. Tapping it opens the
// full trip-details screen with all lifecycle info, fare breakdown, tip etc.
// Memoized — FlatList re-invokes renderItem often; skipping re-renders when
// the row data hasn't changed keeps large histories buttery smooth.
const Row = React.memo(function Row({ item }: { item: CompletedJob }) {
    const cat = CATEGORY_META[item.category];
    const time = new Date(item.completedAt).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
    const cancelled = item.status === 'cancelled';
    const onPress = () => {
        if (item.tripId) router.push({ pathname: '/trip-details', params: { id: item.tripId } });
    };
    return (
        <Pressable style={styles.row} onPress={onPress} disabled={!item.tripId}>
            <View style={styles.thumb}>
                <Text style={styles.thumbEmoji}>{cat.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.title} numberOfLines={1}>{item.pickup} → {item.drop}</Text>
                </View>
                <Text style={styles.meta}>
                    {time} · {item.distanceKm.toFixed(1)} km · {item.payment.toUpperCase()}
                </Text>
                <View style={[styles.badge, cancelled ? styles.badgeCancel : styles.badgeDone]}>
                    <Text style={[styles.badgeText, cancelled ? styles.badgeTextCancel : styles.badgeTextDone]}>
                        {cancelled ? 'Cancelled' : 'Completed'}
                    </Text>
                </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.fare, cancelled && { color: colors.mutedForeground }]}>
                    {cancelled ? '—' : `₹${item.fare}`}
                </Text>
                <ChevronRight size={16} color={colors.mutedForeground} />
            </View>
        </Pressable>
    );
});

export default function Activity() {
    const completed = useJobs((s) => s.completed);
    const active = useJobs((s) => s.active);
    const storeLoading = useJobs((s) => s.loading);
    const hydrateFromServer = useJobs((s) => s.hydrateFromServer);
    const hydrateActiveFromServer = useJobs((s) => s.hydrateActiveFromServer);
    const loading = useInitialLoad();
    const phone = useAuth((s) => s.phone);

    // Real "today" strip — pulled from the server summary, not the mock stats.
    const [summary, setSummary] = useState<EarningsSummary | null>(null);
    const loadSummary = React.useCallback(async () => {
        if (!phone) { setSummary(null); return; }
        try { setSummary(await api.earnings.summary()); } catch { /* keep last */ }
    }, [phone]);

    // Refresh active trip + history whenever the tab regains focus. Ensures
    // that a rider returning after a crash / relaunch always sees any trip
    // still in-flight and can tap Resume to jump straight back into it.
    useFocusEffect(
        React.useCallback(() => {
            hydrateActiveFromServer();
            hydrateFromServer();
            loadSummary();
        }, [hydrateActiveFromServer, hydrateFromServer, loadSummary])
    );

    useEffect(() => { hydrateFromServer(); loadSummary(); }, [hydrateFromServer, loadSummary]);

    const todayEarnings = summary?.today ?? 0;
    const todayTrips = summary?.todayTrips ?? 0;
    const todayHours = summary?.todayHours ?? 0;

    if (loading) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="Activity" showBack={false} />
                <View style={{ paddingHorizontal: 12, paddingTop: 10 }}>
                    <Skeleton width="100%" height={70} rounded="md" />
                    <View style={{ height: 18 }} />
                    <Skeleton width={100} height={12} />
                    <View style={{ marginTop: 8 }}>
                        {[0, 1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)}
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScreenHeader title="Activity" showBack={false} />
            <FlatList
                data={completed}
                keyExtractor={(j, i) => `${j.id}-${i}`}
                renderItem={({ item }) => <Row item={item} />}
                ListHeaderComponent={
                    <View>
                        {/* Resume-active-trip card — surfaces any in-flight trip
                            so a rider who backgrounded / relaunched the app
                            can jump straight back to it. This unblocks them
                            from starting a new trip. */}
                        {active ? (
                            <Pressable
                                onPress={() => router.push('/active-job')}
                                style={styles.activeCard}
                            >
                                <View style={styles.activeIconWrap}>
                                    <Navigation2 size={18} color={colors.primaryForeground} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.activeLabel}>Trip in progress</Text>
                                    <Text style={styles.activeTitle} numberOfLines={1}>
                                        {active.pickup} → {active.drop}
                                    </Text>
                                    <Text style={styles.activeMeta}>
                                        {active.stage} · ₹{active.fare} · {active.distanceKm.toFixed(1)} km
                                    </Text>
                                </View>
                                <ChevronRight size={18} color={colors.foreground} />
                            </Pressable>
                        ) : null}

                        {/* Compact today strip — full breakdown lives in the Earnings tab */}
                        <View style={styles.strip}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.stripLabel}>Today</Text>
                                <Text style={styles.stripValue}>₹{todayEarnings.toLocaleString('en-IN')}</Text>
                            </View>
                            <StatDivider />
                            <StatCol label="Trips" value={String(todayTrips)} />
                            <StatDivider />
                            <StatCol label="Online" value={`${todayHours.toFixed(1)}h`} />
                        </View>
                        <SectionLabel>Recent trips</SectionLabel>
                    </View>
                }
                ItemSeparatorComponent={() => <View style={styles.sep} />}
                contentContainerStyle={{ paddingBottom: 110 }}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Text style={styles.emptyTitle}>No trips yet</Text>
                        <Text style={styles.emptySub}>Go online from Home to receive your first job.</Text>
                    </View>
                }
                refreshControl={<RefreshControl refreshing={storeLoading} onRefresh={() => { hydrateActiveFromServer(); hydrateFromServer(); loadSummary(); }} tintColor={colors.foreground} />}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    strip: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 6, marginTop: 10, padding: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md },
    stripLabel: { fontSize: 10, fontFamily: fonts.bodyBold, color: colors.mutedForeground, letterSpacing: 0.5, textTransform: 'uppercase' },
    stripValue: { fontSize: 16, fontFamily: fonts.displayBold, color: colors.foreground, marginTop: 3, letterSpacing: -0.3 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: colors.background },
    thumb: { width: 40, height: 40, backgroundColor: colors.chipBg, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
    thumbEmoji: { fontSize: 20 },
    title: { fontSize: 13, fontFamily: fonts.bodyBold, color: colors.foreground },
    meta: { fontSize: 11, fontFamily: fonts.body, color: colors.mutedForeground, marginTop: 3 },
    fare: { fontSize: 15, fontFamily: fonts.displayBold, color: colors.foreground },
    badge: { alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.sm, borderWidth: 1 },
    badgeDone: { backgroundColor: '#E8F7EE', borderColor: '#B7E4C7' },
    badgeCancel: { backgroundColor: '#FCECEC', borderColor: '#F5C2C7' },
    badgeText: { fontSize: 10, fontFamily: fonts.bodyBold, letterSpacing: 0.3 },
    badgeTextDone: { color: '#1B7A3E' },
    badgeTextCancel: { color: '#9B2226' },
    sep: { height: 0, borderBottomWidth: 1, borderBottomColor: colors.divider },
    empty: { alignItems: 'center', paddingTop: 60, gap: 6 },
    emptyTitle: { fontSize: 14, fontFamily: fonts.displayBold, color: colors.foreground },
    emptySub: { fontSize: 12, fontFamily: fonts.body, color: colors.mutedForeground },
    activeCard: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        marginHorizontal: 6, marginTop: 10, padding: 12,
        backgroundColor: colors.card, borderWidth: 1, borderColor: colors.primary,
        borderRadius: radius.md,
    },
    activeIconWrap: {
        width: 36, height: 36, borderRadius: radius.sm,
        backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    },
    activeLabel: {
        fontSize: 10, fontFamily: fonts.bodyBold, color: colors.primary,
        letterSpacing: 0.5, textTransform: 'uppercase',
    },
    activeTitle: { fontSize: 13, fontFamily: fonts.displayBold, color: colors.foreground, marginTop: 2 },
    activeMeta: { fontSize: 11, fontFamily: fonts.body, color: colors.mutedForeground, marginTop: 2 },
});
