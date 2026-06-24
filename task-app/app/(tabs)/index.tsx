import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Bell, Wallet, TrendingUp, Star } from 'lucide-react-native';
import { colors } from '@/lib/theme';
import { mockTasks, user, Task } from '@/lib/mockData';
import TaskIcon from '@/components/TaskIcon';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  const renderTask = ({ item }: { item: Task }) => (
    <Pressable
      style={styles.taskRow}
      onPress={() => router.push({ pathname: '/task-details', params: { id: item.id } })}
    >
      <TaskIcon category={item.category} />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={styles.taskTitle}>{item.title}</Text>
        <Text style={styles.taskSub}>{item.subtitle}</Text>
      </View>
      <Text style={styles.reward}>+ ₹{item.reward.toFixed(2)}</Text>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user.name.charAt(0)}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.hello}>Hello, {user.name.split(' ')[0]} 👋</Text>
            <Text style={styles.subhello}>Good to see you back!</Text>
          </View>
          <Pressable style={styles.bellBtn} onPress={() => router.push('/notifications')}>
            <Bell size={20} color="#FFFFFF" />
            <View style={styles.bellDot} />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={mockTasks}
        keyExtractor={(i) => i.id}
        renderItem={renderTask}
        contentContainerStyle={{ paddingHorizontal: 6, paddingBottom: 24 }}
        ListHeaderComponent={
          <View>
            <View style={styles.balanceCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.balanceLabel}>Total Balance</Text>
                <Text style={styles.balanceValue}>₹ {user.balance.toFixed(2)}</Text>
              </View>
              <View style={styles.walletIcon}><Wallet size={26} color="#FFFFFF" /></View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Star size={18} color="#F59E0B" fill="#F59E0B" />
                <View style={{ marginLeft: 8 }}>
                  <Text style={styles.statLabel}>Total Points</Text>
                  <Text style={styles.statValue}>{user.totalPoints.toLocaleString()}</Text>
                </View>
              </View>
              <View style={styles.statCard}>
                <TrendingUp size={18} color={colors.success} />
                <View style={{ marginLeft: 8 }}>
                  <Text style={styles.statLabel}>Today's Earnings</Text>
                  <Text style={styles.statValue}>₹ {user.todayEarnings.toFixed(2)}</Text>
                </View>
              </View>
            </View>

            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Available Tasks</Text>
              <Pressable onPress={() => router.push('/(tabs)/tasks')}>
                <Text style={styles.viewAll}>View All</Text>
              </Pressable>
            </View>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.sep} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.primary, paddingHorizontal: 6, paddingBottom: 14,
    borderBottomLeftRadius: 8, borderBottomRightRadius: 8,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: colors.primary, fontWeight: '800', fontSize: 16 },
  hello: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  subhello: { color: 'rgba(255,255,255,0.85)', fontSize: 11 },
  bellBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  bellDot: { position: 'absolute', top: 6, right: 8, width: 7, height: 7, borderRadius: 4, backgroundColor: '#EF4444' },
  balanceCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary,
    borderRadius: 8, padding: 12, marginTop: 8,
    borderWidth: 1, borderColor: colors.primaryDark,
  },
  balanceLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 12 },
  balanceValue: { color: '#FFFFFF', fontWeight: '800', fontSize: 22, marginTop: 2 },
  walletIcon: {
    width: 44, height: 44, borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  statsRow: { flexDirection: 'row', gap: 4, marginTop: 4 },
  statCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, padding: 10, borderRadius: 6,
    borderWidth: 1, borderColor: colors.border,
  },
  statLabel: { color: colors.mutedForeground, fontSize: 11 },
  statValue: { color: colors.foreground, fontWeight: '700', fontSize: 15 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 4 },
  sectionTitle: { color: colors.foreground, fontWeight: '700', fontSize: 15 },
  viewAll: { color: colors.primary, fontWeight: '600', fontSize: 12 },
  taskRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card,
    padding: 10,
  },
  sep: { height: 1, backgroundColor: colors.border },
  taskTitle: { color: colors.foreground, fontWeight: '700', fontSize: 14 },
  taskSub: { color: colors.mutedForeground, fontSize: 11, marginTop: 2 },
  reward: { color: colors.success, fontWeight: '700', fontSize: 13 },
});
