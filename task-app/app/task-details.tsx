import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import ScreenHeader from '@/components/ScreenHeader';
import TaskIcon from '@/components/TaskIcon';
import { colors } from '@/lib/theme';
import { mockTasks } from '@/lib/mockData';

export default function TaskDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const task = mockTasks.find((t) => t.id === id) || mockTasks[0];
  const [loading, setLoading] = useState(false);

  const onStart = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1200);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Task Details" />
      <ScrollView contentContainerStyle={{ padding: 6, paddingBottom: 90 }}>
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TaskIcon category={task.category} size={48} />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={styles.title}>{task.title}</Text>
              <Text style={styles.sub}>{task.subtitle}</Text>
              <Text style={styles.reward}>+ ₹{task.reward.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Description</Text>
        <View style={styles.card}>
          <Text style={styles.body}>
            {task.description || `Complete the task "${task.title}" and earn reward instantly.`}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Steps to Follow</Text>
        <View style={styles.card}>
          {(task.steps || ['Click on Start Task', 'Complete the task', 'Click on Submit', 'Get your reward']).map((s, i) => (
            <Text key={i} style={styles.bullet}>{i + 1}. {s}</Text>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Important Notes</Text>
        <View style={styles.card}>
          {(task.notes || ['Follow the steps properly', 'Only one attempt per day']).map((n, i) => (
            <Text key={i} style={styles.bullet}>• {n}</Text>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.startBtn} onPress={onStart} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.startText}>Start Task</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  card: {
    backgroundColor: colors.card, padding: 10, borderRadius: 6,
    borderWidth: 1, borderColor: colors.border, marginTop: 4,
  },
  title: { color: colors.foreground, fontWeight: '700', fontSize: 14 },
  sub: { color: colors.mutedForeground, fontSize: 12, marginTop: 2 },
  reward: { color: colors.success, fontWeight: '700', fontSize: 13, marginTop: 2 },
  sectionTitle: { color: colors.foreground, fontWeight: '700', fontSize: 13, marginTop: 8 },
  body: { color: colors.foreground, fontSize: 12, lineHeight: 18 },
  bullet: { color: colors.foreground, fontSize: 12, marginVertical: 2 },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0, padding: 6,
    backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border,
  },
  startBtn: { backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 6, alignItems: 'center' },
  startText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
