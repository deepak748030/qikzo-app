import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native';
import { BellRing, Wallet, FileCheck2, Package, Star, Info } from 'lucide-react-native';
import { colors, fonts, radius } from '@/lib/theme';
import ScreenHeader from '@/components/ScreenHeader';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authStore';

type Kind = 'job' | 'payout' | 'doc' | 'rating' | 'info';
type N = { id: string; title: string; body: string; time: string; read: boolean; kind: Kind };

const ICONS = { job: Package, payout: Wallet, doc: FileCheck2, rating: Star, info: Info } as const;

// No mock/seed data — notifications are strictly server-driven.

function topicToKind(t: string): Kind {
    if (t === 'trip' || t === 'booking') return 'job';
    if (t === 'payment' || t === 'wallet') return 'payout';
    if (t === 'support') return 'doc';
    if (t === 'promo') return 'info';
    return 'info';
}
function fmtTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.round(diff / 60_000);
    if (m < 1) return 'Just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.round(h / 24);
    if (d === 1) return 'Yesterday';
    if (d < 7) return `${d}d ago`;
    return new Date(iso).toLocaleDateString();
}

export default function NotificationsScreen() {
    const phone = useAuth((s) => s.phone);
    const [items, setItems] = useState<N[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        if (!phone) { setItems([]); return; }
        try {
            const { items: server } = await api.notifications.list({ limit: 50 });
            setItems(server.map((n) => ({
                id: n._id,
                kind: topicToKind(n.topic),
                title: n.title,
                body: n.body,
                time: fmtTime(n.createdAt),
                read: !!n.readAt,
            })));
        } catch {
            setItems([]);
        }
    }, [phone]);

    useEffect(() => { load(); }, [load]);

    const onRefresh = async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    };

    const markAllRead = async () => {
        setItems((prev) => prev.map((n) => ({ ...n, read: true })));
        if (phone) { try { await api.notifications.markAllRead(); } catch {} }
    };

    const markOne = async (id: string) => {
        setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
        if (phone) { try { await api.notifications.markRead(id); } catch {} }
    };

    const unread = items.filter((n) => !n.read).length;

    const renderItem = ({ item }: { item: N }) => {
        const Icon = ICONS[item.kind];
        return (
            <Pressable style={[styles.row, !item.read && styles.rowUnread]} onPress={() => markOne(item.id)}>
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
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.foreground} />}
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
