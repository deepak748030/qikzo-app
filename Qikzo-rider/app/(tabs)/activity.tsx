import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
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

// Renders a single completed job row — separated by 1px hairline.
function Row({ item }: { item: CompletedJob }) {
    const cat = CATEGORY_META[item.category];
    const time = new Date(item.completedAt).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
    return (
        <View style={styles.row}>
            <View style={styles.thumb}>
                <Text style={styles.thumbEmoji}>{cat.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={1}>{item.pickup} → {item.drop}</Text>
                <Text style={styles.meta}>{time} · {item.distanceKm.toFixed(1)} km · {item.payment.toUpperCase()}</Text>
            </View>
            <Text style={styles.fare}>₹{item.fare}</Text>
        </View>
    );
}

export default function Activity() {
    const completed = useJobs((s) => s.completed);
    const storeLoading = useJobs((s) => s.loading);
    const hydrateFromServer = useJobs((s) => s.hydrateFromServer);
    const loading = useInitialLoad();
    const phone = useAuth((s) => s.phone);

    // Real "today" strip — pulled from the server summary, not the mock stats.
    const [summary, setSummary] = useState<EarningsSummary | null>(null);
    const loadSummary = React.useCallback(async () => {
        if (!phone) { setSummary(null); return; }
        try { setSummary(await api.earnings.summary()); } catch { /* keep last */ }
    }, [phone]);

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
                        {/* Compact today strip — full breakdown lives in the Earnings tab */}
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
                refreshControl={<RefreshControl refreshing={storeLoading} onRefresh={() => { hydrateFromServer(); loadSummary(); }} tintColor={colors.foreground} />}
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
    sep: { height: 0, borderBottomWidth: 1, borderBottomColor: colors.divider },
    empty: { alignItems: 'center', paddingTop: 60, gap: 6 },
    emptyTitle: { fontSize: 14, fontFamily: fonts.displayBold, color: colors.foreground },
    emptySub: { fontSize: 12, fontFamily: fonts.body, color: colors.mutedForeground },
});
