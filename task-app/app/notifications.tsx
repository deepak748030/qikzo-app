import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { Package, Tag, BellRing, Truck, Gift, Info } from 'lucide-react-native';
import { colors, fonts } from '@/lib/theme';
import ScreenHeader from '@/components/ScreenHeader';

type N = {
    id: string;
    title: string;
    body: string;
    time: string;
    read: boolean;
    type: 'order' | 'offer' | 'delivery' | 'reward' | 'info';
};

const ICONS = {
    order: Package, offer: Tag, delivery: Truck, reward: Gift, info: Info,
} as const;

const SEED: N[] = [
    { id: '1', type: 'order', title: 'Booking confirmed', body: 'Your booking #QZ2104 has been placed. Searching for a rider near you.', time: '2m ago', read: false },
    { id: '2', type: 'delivery', title: 'Rider on the way', body: 'Rohit is arriving at your pickup location on Honda Activa.', time: '15m ago', read: false },
    { id: '3', type: 'offer', title: 'Flat ₹30 off your next ride', body: 'Use code QIZ30 on your next delivery booking. Valid today only.', time: '1h ago', read: true },
    { id: '4', type: 'reward', title: 'You earned ₹15 cashback', body: 'Cashback credited to your Qikzo wallet for booking #QZ2018.', time: '3h ago', read: true },
    { id: '5', type: 'info', title: 'New saved place added', body: 'Office address has been saved successfully.', time: 'Yesterday', read: true },
    { id: '6', type: 'order', title: 'Booking delivered', body: 'Booking #QZ2014 was delivered. Hope everything reached safely!', time: '2d ago', read: true },
];

export default function NotificationsScreen() {
    const [items, setItems] = useState<N[]>(SEED);

    const markAllRead = () => setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    const unread = items.filter((n) => !n.read).length;

    const renderItem = ({ item }: { item: N }) => {
        const Icon = ICONS[item.type];
        return (
            <Pressable
                style={[styles.row, !item.read && styles.rowUnread]}
                onPress={() => setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)))}
            >
                <View style={styles.iconWrap}>
                    <Icon size={18} color={colors.foreground} strokeWidth={1.8} />
                </View>
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
                right={
                    unread > 0 ? (
                        <Pressable onPress={markAllRead} hitSlop={6}>
                            <Text style={styles.mark}>Read all</Text>
                        </Pressable>
                    ) : null
                }
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
                        <Text style={styles.emptySub}>Booking updates and offers will show up here.</Text>
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
    rowUnread: { backgroundColor: '#FAFAFA' },
    iconWrap: { width: 36, height: 36, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', borderRadius: 0 },
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
    title: { flex: 1, fontSize: 13, fontFamily: fonts.bodyBold, color: colors.foreground },
    time: { fontSize: 10, fontFamily: fonts.body, color: colors.mutedForeground },
    body: { fontSize: 12, fontFamily: fonts.body, color: colors.mutedForeground, marginTop: 3, lineHeight: 17 },
    dot: { width: 7, height: 7, backgroundColor: colors.accent, marginTop: 6 },
    empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 8, paddingHorizontal: 24 },
    emptyTitle: { fontSize: 15, fontFamily: fonts.displayBold, color: colors.foreground, marginTop: 6 },
    emptySub: { fontSize: 12, fontFamily: fonts.body, color: colors.mutedForeground, textAlign: 'center' },
});
