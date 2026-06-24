import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { taskIconMap, Task } from '@/lib/mockData';
import { colors } from '@/lib/theme';

export default function TaskIcon({ category, size = 40 }: { category: Task['category']; size?: number }) {
  const { Icon, bg, color } = taskIconMap[category];
  return (
    <View style={[styles.box, { width: size, height: size, backgroundColor: bg }]}>
      <Icon size={size * 0.55} color={color} strokeWidth={2.2} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
});
