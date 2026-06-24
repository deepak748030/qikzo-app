import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Star } from 'lucide-react-native';
import { router } from 'expo-router';
import { colors } from '@/lib/theme';
import { mockTasks, user, Task } from '@/lib/mockData';
import TaskIcon from '@/components/TaskIcon';

const FILTERS = ['All Tasks', 'Trending', 'High Paying', 'Bonus'] as const;
type Filter = typeof FILTERS[number];

export default function TasksScreen() {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<Filter>('All Tasks');

  const data = useMemo(() => {
    if (filter === 'All Tasks') return mockTasks;
    const tagMap: Record<string, Task['tag']> = { Trending: 'trending', 'High Paying': 'high', Bonus: 'bonus' };
    return mockTasks.filter((t) => t.tag === tagMap[filter]);
  }, [filter]);

  const renderItem = ({ item }: { item: Task }) => (
    <Pressable
      style={styles.row}
      onPress={() => router.push({ pathname: '/task-details', params: { id: item.id } })}
    >
      <TaskIcon category={item.category} />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.sub}>{item.subtitle}</Text>
        <Text style={styles.reward}>+ ₹{item.reward.toFixed(2)}</Text>
      </View>
      <Pressable style={styles.startBtn} onPress={() => router.push({ pathname: '/task-details', params: { id: item.id } })}>
        <Text style={styles.startText}>Start</Text>
      </Pressable>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <Pressable hitSlop={10} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <ChevronLeft size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Tasks</Text>
          <View style={styles.pointsPill}>
            <Star size={12} color="#F59E0B" fill="#F59E0B" />
            <Text style={styles.pointsText}>{user.totalPoints.toLocaleString()}</Text>
          </View>
        </View>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const active = filter === f;
          return (
            <Pressable key={f} style={[styles.chip, active && styles.chipActive]} onPress={() => setFilter(f)}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{f}</Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={data}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 6, paddingBottom: 24, paddingTop: 4 }}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListEmptyComponent={<Text style={styles.empty}>No tasks available</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.primary, paddingHorizontal: 6, paddingBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  pointsPill: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, gap: 4,
  },
  pointsText: { color: '#F59E0B', fontWeight: '700', fontSize: 12 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 6, paddingVertical: 8, gap: 4 },
  chip: {
    flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: 'center',
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.foreground, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#FFFFFF' },
  row: {
    flexDirection: 'row', alignItems: 'center', padding: 10,
    backgroundColor: colors.card,
  },
  sep: { height: 1, backgroundColor: colors.border },
  title: { color: colors.foreground, fontWeight: '700', fontSize: 14 },
  sub: { color: colors.mutedForeground, fontSize: 11, marginTop: 2 },
  reward: { color: colors.success, fontWeight: '700', fontSize: 12, marginTop: 2 },
  startBtn: { backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 6 },
  startText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  empty: { textAlign: 'center', color: colors.mutedForeground, marginTop: 40 },
});
