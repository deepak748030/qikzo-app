import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { BellRing, Wallet, FileCheck2, Package, Star, Info } from 'lucide-react-native';
import { colors, fonts, radius } from '@/lib/theme';
import ScreenHeader from '@/components/ScreenHeader';

type Kind = 'job' | 'payout' | 'doc' | 'rating' | 'info';
type N = { id: string; title: string; body: string; time: string; read: boolean; kind: Kind };

const ICONS = { job: Package, payout: Wallet, doc: FileCheck2, rating: Star, info: Info } as const;

const SEED: N[] = [
    { id: '1', kind: 'payout', title: 'Payout credited', body: '₹940 for today\'s trips has been sent to your bank account.', time: '10m ago', read: false },
    { id: '2', kind: 'job', title: 'New job nearby', body: 'A parcel pickup from Karol Bagh is 400 m from you.', time: '32m ago', read: false },
    { id: '3', kind: 'rating', title: '5-star rating received', body: 'Priya rated your last trip 5 stars. Great work!', time: '2h ago', read: true },
    { id: '4', kind: 'doc', title: 'Insurance under review', body: 'Your uploaded insurance document is being verified.', time: 'Yesterday', read: true },
    { id: '5', kind: 'info', title: 'Weekly earnings summary', body: 'You earned ₹5,820 across 42 trips this week.', time: '2d ago', read: true },
];

export default function NotificationsScreen() {
    const [items, setItems] = useState<N[]>(SEED);
    const markAllRead = () => setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    const unread = items.filter((n) => !n.read).length;

    const renderItem = ({ item }: { item: N }) => {
        const Icon = ICONS[item.kind];
        return (
            <Pressable
                style={[styles.row, !item.read && styles.rowUnread]}
                onPress={() => setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)))}
            >
                <View style={styles.iconWrap}><Icon size={18} color={colors.foreground} strokeWidth={1.8} /></View>
                <View style={{ flex: 1 }}>
                    <View style={styles.titleRow}>
                        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.time}>{item.time}</Text>
                    </View>
                    <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
                </View>
                {!item.read ? <View style={styles.dot} /> : null}
            </Pressable>
        );
    };

    return (
        <View style={styles.container}>
            <ScreenHeader
                title="Notifications"
                right={unread > 0 ? (<Pressable onPress={markAllRead} hitSlop={6}><Text style={styles.mark}>Read all</Text></Pressable>) : null}
            />
            <FlatList
                data={items}
                keyExtractor={(n) => n.id}
                renderItem={renderItem}
                ItemSeparatorComponent={() => <View style={{ height: 0, borderBottomWidth: 1, borderBottomColor: colors.divider }} />}
                contentContainerStyle={{ paddingBottom: 24 }}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <BellRing size={42} color={colors.mutedForeground} strokeWidth={1.4} />
                        <Text style={styles.emptyTitle}>No notifications yet</Text>
                        <Text style={styles.emptySub}>Job, payout and document updates will show up here.</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    mark: { fontSize: 12, fontFamily: fonts.bodyBold, color: colors.foreground },
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 6, paddingVertical: 12, backgroundColor: colors.background },
    rowUnread: { backgroundColor: '#FAF7EF' },
    iconWrap: { width: 36, height: 36, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
    title: { flex: 1, fontSize: 13, fontFamily: fonts.bodyBold, color: colors.foreground },
    time: { fontSize: 10, fontFamily: fonts.body, color: colors.mutedForeground },
    body: { fontSize: 12, fontFamily: fonts.body, color: colors.mutedForeground, marginTop: 3, lineHeight: 17 },
    dot: { width: 7, height: 7, backgroundColor: colors.accent, marginTop: 6, borderRadius: radius.lg },
    empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 8, paddingHorizontal: 24 },
    emptyTitle: { fontSize: 15, fontFamily: fonts.displayBold, color: colors.foreground, marginTop: 6 },
    emptySub: { fontSize: 12, fontFamily: fonts.body, color: colors.mutedForeground, textAlign: 'center' },
});
