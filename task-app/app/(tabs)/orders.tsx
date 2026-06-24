import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { colors, fonts } from '@/lib/theme';
import ScreenHeader from '@/components/ScreenHeader';
import { mockOrders, Order, OrderStatus } from '@/lib/mockData';

const STATUS_COLOR: Record<OrderStatus, string> = {
  Placed: colors.warning,
  Packed: colors.warning,
  'Out for delivery': colors.accent,
  Delivered: colors.success,
};

export default function OrdersScreen() {
  return (
    <View style={styles.container}>
      <ScreenHeader title="My Orders" showBack={false} />
      <FlatList
        data={mockOrders}
        keyExtractor={(o: Order) => o.id}
        ItemSeparatorComponent={() => <View style={{ height: 0 }} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📦</Text>
            <Text style={styles.emptyTitle}>No orders yet</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.iconBox}><Text style={styles.icon}>🧾</Text></View>
            <View style={styles.info}>
              <Text style={styles.id}>Order #{item.id}</Text>
              <Text style={styles.date}>{item.date}</Text>
              <Text style={styles.items}>{item.items} items</Text>
            </View>
            <View style={styles.right}>
              <Text style={styles.total}>₹{item.total}</Text>
              <View style={[styles.statusPill, { borderColor: STATUS_COLOR[item.status] }]}>
                <Text style={[styles.status, { color: STATUS_COLOR[item.status] }]}>{item.status}</Text>
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  row: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 6,
    borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  iconBox: { width: 44, height: 44, backgroundColor: colors.chipBg, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', borderRadius: 0 },
  icon: { fontSize: 22 },
  info: { flex: 1, marginLeft: 10 },
  id: { fontSize: 14, fontFamily: fonts.heading, color: colors.foreground },
  date: { fontSize: 11, color: colors.mutedForeground, fontFamily: fonts.body, marginTop: 2 },
  items: { fontSize: 11, color: colors.mutedForeground, fontFamily: fonts.body, marginTop: 1 },
  right: { alignItems: 'flex-end' },
  total: { fontSize: 15, fontFamily: fonts.displayBold, color: colors.foreground },
  statusPill: { marginTop: 4, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 0 },
  status: { fontSize: 9, fontFamily: fonts.bodyBold },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 46 },
  emptyTitle: { fontSize: 16, fontFamily: fonts.displayBold, color: colors.foreground, marginTop: 10 },
});
