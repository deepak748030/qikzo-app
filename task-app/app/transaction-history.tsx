import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import ScreenHeader from '@/components/ScreenHeader';
import { colors } from '@/lib/theme';
import { mockTransactions, Transaction } from '@/lib/mockData';
import { FileText } from 'lucide-react-native';

const TABS = ['All', 'Credits', 'Debits'] as const;
type Tab = typeof TABS[number];

export default function TransactionHistory() {
  const [tab, setTab] = useState<Tab>('All');

  const data = useMemo(() => {
    if (tab === 'Credits') return mockTransactions.filter((t) => t.type === 'credit');
    if (tab === 'Debits') return mockTransactions.filter((t) => t.type === 'debit');
    return mockTransactions;
  }, [tab]);

  const renderItem = ({ item }: { item: Transaction }) => (
    <View style={styles.row}>
      <View style={[styles.icon, { backgroundColor: '#F1F5F9' }]}>
        <FileText size={18} color={item.type === 'credit' ? colors.success : colors.danger} />
      </View>
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.sub}>{item.subtitle}</Text>
        <Text style={styles.date}>{item.date}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[styles.amount, { color: item.type === 'credit' ? colors.success : colors.danger }]}>
          {item.type === 'credit' ? '+ ' : '- '}₹{item.amount.toFixed(2)}
        </Text>
        <Text style={styles.status}>{item.status}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="Transaction History" />
      <View style={styles.tabRow}>
        {TABS.map((t) => {
          const active = tab === t;
          return (
            <Pressable key={t} style={[styles.tab, active && styles.tabActive]} onPress={() => setTab(t)}>
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t}</Text>
            </Pressable>
          );
        })}
      </View>
      <FlatList
        data={data}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        contentContainerStyle={{ padding: 6, paddingBottom: 24 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  tabRow: { flexDirection: 'row', paddingHorizontal: 6, paddingTop: 8, gap: 4 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderBottomWidth: 2, borderColor: 'transparent' },
  tabActive: { borderColor: colors.primary },
  tabText: { color: colors.mutedForeground, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: colors.primary, fontWeight: '700' },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card,
    padding: 10,
  },
  sep: { height: 1, backgroundColor: colors.border },
  icon: { width: 36, height: 36, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.foreground, fontWeight: '700', fontSize: 13 },
  sub: { color: colors.mutedForeground, fontSize: 11, marginTop: 1 },
  date: { color: colors.mutedForeground, fontSize: 10, marginTop: 1 },
  amount: { fontWeight: '700', fontSize: 13 },
  status: { color: colors.success, fontSize: 10, fontWeight: '600', marginTop: 2 },
});
