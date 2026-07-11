import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Banknote, Smartphone, Package as PackageIcon, Clock, IndianRupee, ArrowRight, Plus } from 'lucide-react-native';
import { colors, fonts, radius } from '@/lib/theme';
import ScreenHeader from '@/components/ScreenHeader';
import Skeleton from '@/components/Skeleton';
import { useInitialLoad } from '@/lib/useInitialLoad';
import { useAuth, formatPayoutLabel } from '@/lib/authStore';
import { stats, weeklyEarnings, weekDays, nextPayout } from '@/lib/mockData';
import { api } from '@/lib/api';
import type { EarningsSummary } from '@/lib/api/endpoints/earnings';

type Range = 'today' | 'week' | 'month';

// Standalone Earnings tab — hero, weekly chart, cash/UPI split, next payout.
export default function Earnings() {
    const [range, setRange] = useState<Range>('today');
    const loading = useInitialLoad();
    const payout = useAuth((s) => s.payout);
    const phone = useAuth((s) => s.phone);
    const payoutLabel = formatPayoutLabel(payout);
    const [summary, setSummary] = useState<EarningsSummary | null>(null);

    useEffect(() => {
        if (!phone) { setSummary(null); return; }
        let cancelled = false;
        (async () => {
            try {
                const s = await api.earnings.summary();
                if (!cancelled) setSummary(s);
            } catch { /* keep mock fallback */ }
        })();
        return () => { cancelled = true; };
    }, [phone]);

    const todayEarnings = summary?.today ?? stats.todayEarnings;
    const weekEarnings = summary?.week ?? stats.weekEarnings;
    const monthEarnings = summary?.month ?? stats.monthEarnings;
    const todayTrips = summary?.todayTrips ?? stats.todayTrips;
    const weekTrips = summary?.weekTrips ?? stats.weekTrips;
    const monthTrips = summary?.monthTrips ?? stats.monthTrips;
    const todayHours = summary?.todayHours ?? stats.todayHours;
    const weeklyData = summary?.weekly ?? weeklyEarnings;

    const value = range === 'today' ? todayEarnings : range === 'week' ? weekEarnings : monthEarnings;
    const trips = range === 'today' ? todayTrips : range === 'week' ? weekTrips : monthTrips;
    const hours = range === 'today' ? `${todayHours.toFixed(1)}h` : range === 'week' ? '31h' : '128h';
    const avg = `₹${Math.round(value / Math.max(1, trips))}`;

    const max = useMemo(() => Math.max(...weeklyData, 1), [weeklyData]);
    const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

    if (loading) {
        return (
            <View style={styles.container}>
                <ScreenHeader title="Earnings" showBack={false} />
                <View style={{ paddingHorizontal: 6, paddingTop: 10, gap: 12 }}>
                    <Skeleton width="100%" height={190} rounded="md" />
                    <Skeleton width={120} height={12} style={{ marginTop: 10, marginLeft: 6 }} />
                    <Skeleton width="100%" height={170} rounded="md" />
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                        <Skeleton width="49%" height={80} rounded="sm" />
                        <Skeleton width="49%" height={80} rounded="sm" />
                    </View>
                    <Skeleton width="100%" height={72} rounded="md" />
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScreenHeader title="Earnings" showBack={false} />
            <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
                {/* Hero card */}
                <View style={styles.hero}>
                    <View style={styles.tabs}>
                        {(['today', 'week', 'month'] as Range[]).map((r) => (
                            <Pressable key={r} style={[styles.tab, range === r && styles.tabActive]} onPress={() => setRange(r)}>
                                <Text style={[styles.tabText, range === r && styles.tabTextActive]}>{r[0].toUpperCase() + r.slice(1)}</Text>
                            </Pressable>
                        ))}
                    </View>
                    <View style={styles.amountRow}>
                        <Text style={styles.currency}>₹</Text>
                        <Text style={styles.amount}>{value.toLocaleString('en-IN')}</Text>
                    </View>
                    <Text style={styles.caption}>Earned {range === 'today' ? 'today' : `this ${range}`}</Text>

                    <View style={styles.metrics}>
                        <Metric Icon={PackageIcon} label="Trips" value={String(trips)} />
                        <Metric Icon={Clock} label="Online" value={hours} />
                        <Metric Icon={IndianRupee} label="Avg / trip" value={avg} />
                    </View>
                </View>

                {/* Weekly chart */}
                <Text style={styles.section}>This week</Text>
                <View style={styles.chartCard}>
                    <View style={styles.chartRow}>
                        {weeklyData.map((v, i) => {
                            const h = 8 + (v / max) * 96;
                            const isToday = i === todayIdx;
                            return (
                                <View key={i} style={styles.chartCol}>
                                    <Text style={[styles.chartVal, isToday && styles.chartValToday]}>{v}</Text>
                                    <View style={[styles.bar, { height: h }, isToday && styles.barToday]} />
                                    <Text style={[styles.chartDay, isToday && styles.chartDayToday]}>{weekDays[i]}</Text>
                                </View>
                            );
                        })}
                    </View>
                </View>

                {/* Cash vs UPI */}
                <Text style={styles.section}>Today's collections</Text>
                <View style={styles.splitRow}>
                    <SplitCard Icon={Banknote} label="Cash" value={stats.cashCollected} tint={colors.warning} />
                    <SplitCard Icon={Smartphone} label="UPI" value={stats.upiCollected} tint={colors.success} />
                </View>

                {/* Next payout */}
                <Text style={styles.section}>Next payout</Text>
                {payout ? (
                    <Pressable style={styles.payout} onPress={() => router.push('/payout-details')}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.payoutAmt}>₹{nextPayout.amount.toLocaleString('en-IN')}</Text>
                            <Text style={styles.payoutMeta}>{nextPayout.when} · {payoutLabel}</Text>
                        </View>
                        <View style={styles.payoutBtn}>
                            <ArrowRight size={16} color={colors.primaryForeground} />
                        </View>
                    </Pressable>
                ) : (
                    <Pressable style={styles.addBank} onPress={() => router.push('/payout-details')}>
                        <View style={styles.addBankIcon}><Plus size={16} color={colors.primaryForeground} /></View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.addBankTitle}>Add bank account</Text>
                            <Text style={styles.addBankSub}>Required to receive ₹{nextPayout.amount.toLocaleString('en-IN')} payout {nextPayout.when.toLowerCase()}.</Text>
                        </View>
                        <ArrowRight size={16} color={colors.foreground} />
                    </Pressable>
                )}
            </ScrollView>
        </View>
    );
}

function Metric({ Icon, label, value }: { Icon: any; label: string; value: string }) {
    return (
        <View style={styles.metric}>
            <Icon size={14} color={colors.primaryForeground} strokeWidth={2} />
            <Text style={styles.metricValue}>{value}</Text>
            <Text style={styles.metricLabel}>{label}</Text>
        </View>
    );
}

function SplitCard({ Icon, label, value, tint }: { Icon: any; label: string; value: number; tint: string }) {
    return (
        <View style={styles.split}>
            <View style={[styles.splitIcon, { backgroundColor: tint }]}>
                <Icon size={14} color={colors.card} strokeWidth={2.4} />
            </View>
            <Text style={styles.splitLabel}>{label}</Text>
            <Text style={styles.splitValue}>₹{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    hero: { backgroundColor: colors.primary, borderRadius: radius.md, padding: 14, marginHorizontal: 6, marginTop: 10 },
    tabs: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.08)', padding: 3, borderRadius: radius.pill },
    tab: { flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: radius.pill },
    tabActive: { backgroundColor: colors.accent },
    tabText: { fontSize: 12, fontFamily: fonts.bodyBold, color: colors.primaryForeground, letterSpacing: 0.3 },
    tabTextActive: { color: colors.accentForeground },
    amountRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 16 },
    currency: { color: colors.primaryForeground, fontFamily: fonts.displayBold, fontSize: 22, marginTop: 8, marginRight: 2, opacity: 0.85 },
    amount: { color: colors.primaryForeground, fontFamily: fonts.displayBold, fontSize: 44, letterSpacing: -1 },
    caption: { color: colors.primaryForeground, fontFamily: fonts.body, fontSize: 12, opacity: 0.75 },
    metrics: { flexDirection: 'row', gap: 8, marginTop: 16 },
    metric: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', padding: 10, borderRadius: radius.sm, gap: 2 },
    metricValue: { color: colors.primaryForeground, fontFamily: fonts.displayBold, fontSize: 15, marginTop: 4 },
    metricLabel: { color: colors.primaryForeground, fontFamily: fonts.body, fontSize: 10, opacity: 0.75 },

    section: { fontSize: 11, fontFamily: fonts.bodyBold, color: colors.mutedForeground, letterSpacing: 0.6, textTransform: 'uppercase', paddingHorizontal: 12, marginTop: 22, marginBottom: 8 },

    chartCard: { marginHorizontal: 6, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12 },
    chartRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 140, paddingHorizontal: 4 },
    chartCol: { alignItems: 'center', flex: 1, gap: 4 },
    chartVal: { fontSize: 9, fontFamily: fonts.body, color: colors.mutedForeground },
    chartValToday: { color: colors.foreground, fontFamily: fonts.bodyBold },
    bar: { width: 14, backgroundColor: colors.chipBg, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
    barToday: { backgroundColor: colors.accent, borderColor: colors.accent },
    chartDay: { fontSize: 10, fontFamily: fonts.bodyBold, color: colors.mutedForeground },
    chartDayToday: { color: colors.primary },

    splitRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 6 },
    split: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 12, gap: 6 },
    splitIcon: { width: 26, height: 26, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
    splitLabel: { fontSize: 11, fontFamily: fonts.bodyBold, color: colors.mutedForeground, letterSpacing: 0.5, textTransform: 'uppercase' },
    splitValue: { fontSize: 18, fontFamily: fonts.displayBold, color: colors.foreground, letterSpacing: -0.3 },

    payout: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 6, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 14 },
    payoutAmt: { fontSize: 22, fontFamily: fonts.displayBold, color: colors.foreground, letterSpacing: -0.4 },
    payoutMeta: { fontSize: 12, fontFamily: fonts.body, color: colors.mutedForeground, marginTop: 3 },
    payoutBtn: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },

    addBank: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 6, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.accent, borderStyle: 'dashed', borderRadius: radius.md, padding: 14 },
    addBankIcon: { width: 34, height: 34, borderRadius: radius.pill, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
    addBankTitle: { fontSize: 14, fontFamily: fonts.displayBold, color: colors.foreground },
    addBankSub: { fontSize: 11, fontFamily: fonts.body, color: colors.mutedForeground, marginTop: 2 },
});
