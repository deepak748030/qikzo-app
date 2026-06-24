import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Wallet as WalletIcon, Plus, Building2, Smartphone, FileText, ChevronRight } from 'lucide-react-native';
import { colors } from '@/lib/theme';
import { user, mockTransactions, Transaction } from '@/lib/mockData';

const ACTIONS = [
  { key: 'add', label: 'Add Money', Icon: Plus, color: '#2D6BFF', bg: '#DBEAFE', route: '/add-money' as const },
  { key: 'bank', label: 'Bank Details', Icon: Building2, color: '#22C55E', bg: '#DCFCE7', route: '/bank-details' as const },
  { key: 'upi', label: 'UPI Details', Icon: Smartphone, color: '#F97316', bg: '#FFEDD5', route: '/upi-details' as const },
];

function txnIconColor(type: Transaction['type']) {
  return type === 'credit' ? colors.success : colors.danger;
}

export default function WalletScreen() {
  const insets = useSafeAreaInsets();

  const renderTxn = ({ item }: { item: Transaction }) => (
    <View style={styles.txnRow}>
      <View style={[styles.txnIcon, { backgroundColor: '#F1F5F9' }]}>
        <FileText size={18} color={txnIconColor(item.type)} />
      </View>
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={styles.txnTitle}>{item.title}</Text>
        <Text style={styles.txnSub}>{item.subtitle}</Text>
        <Text style={styles.txnDate}>{item.date}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[styles.txnAmount, { color: txnIconColor(item.type) }]}>
          {item.type === 'credit' ? '+ ' : '- '}₹{item.amount.toFixed(2)}
        </Text>
        <Text style={styles.txnStatus}>{item.status}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>Wallet</Text>
      </View>

      <FlatList
        data={mockTransactions}
        keyExtractor={(i) => i.id}
        renderItem={renderTxn}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        contentContainerStyle={{ paddingHorizontal: 6, paddingBottom: 24 }}
        ListHeaderComponent={
          <View>
            <View style={styles.balanceCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.balanceLabel}>Total Balance</Text>
                <Text style={styles.balanceValue}>₹ {user.balance.toFixed(2)}</Text>
              </View>
              <View style={styles.walletIcon}><WalletIcon size={26} color="#FFFFFF" /></View>
            </View>

            <View style={styles.withdrawBox}>
              <View style={{ flex: 1 }}>
                <Text style={styles.withdrawLabel}>Withdrawable Balance</Text>
                <Text style={styles.withdrawValue}>₹ {user.balance.toFixed(2)}</Text>
              </View>
              <Pressable style={styles.withdrawBtn} onPress={() => router.push('/withdraw')}>
                <Text style={styles.withdrawBtnText}>Withdraw</Text>
              </Pressable>
            </View>

            <View style={styles.actionsRow}>
              {ACTIONS.map((a) => (
                <Pressable key={a.key} style={styles.actionCard} onPress={() => router.push(a.route)}>
                  <View style={[styles.actionIcon, { backgroundColor: a.bg }]}>
                    <a.Icon size={18} color={a.color} />
                  </View>
                  <Text style={styles.actionLabel}>{a.label}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Transaction History</Text>
              <Pressable onPress={() => router.push('/transaction-history')}>
                <Text style={styles.viewAll}>View All</Text>
              </Pressable>
            </View>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.primary, paddingHorizontal: 6, paddingBottom: 12, alignItems: 'center' },
  headerTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  balanceCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary,
    borderRadius: 8, padding: 12, marginTop: 8,
  },
  balanceLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 12 },
  balanceValue: { color: '#FFFFFF', fontWeight: '800', fontSize: 22, marginTop: 2 },
  walletIcon: {
    width: 44, height: 44, borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center',
  },
  withdrawBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card,
    borderRadius: 6, padding: 10, marginTop: 4, borderWidth: 1, borderColor: colors.border,
  },
  withdrawLabel: { color: colors.mutedForeground, fontSize: 11 },
  withdrawValue: { color: colors.foreground, fontWeight: '700', fontSize: 16 },
  withdrawBtn: { backgroundColor: colors.success, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 },
  withdrawBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  actionsRow: { flexDirection: 'row', gap: 4, marginTop: 4 },
  actionCard: {
    flex: 1, alignItems: 'center', backgroundColor: colors.card, padding: 10,
    borderRadius: 6, borderWidth: 1, borderColor: colors.border,
  },
  actionIcon: { width: 36, height: 36, borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  actionLabel: { color: colors.foreground, fontSize: 11, fontWeight: '600' },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 4 },
  sectionTitle: { color: colors.foreground, fontWeight: '700', fontSize: 14 },
  viewAll: { color: colors.primary, fontWeight: '600', fontSize: 12 },
  txnRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card,
    padding: 10,
  },
  sep: { height: 1, backgroundColor: colors.border },
  txnIcon: { width: 36, height: 36, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  txnTitle: { color: colors.foreground, fontWeight: '700', fontSize: 13 },
  txnSub: { color: colors.mutedForeground, fontSize: 11, marginTop: 1 },
  txnDate: { color: colors.mutedForeground, fontSize: 10, marginTop: 1 },
  txnAmount: { fontWeight: '700', fontSize: 13 },
  txnStatus: { color: colors.success, fontSize: 10, fontWeight: '600', marginTop: 2 },
});
