import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import ScreenHeader from '@/components/ScreenHeader';
import { colors } from '@/lib/theme';
import { mockNotifications, AppNotification } from '@/lib/mockData';
import { Send, FileText, Wallet, Bell, Gift } from 'lucide-react-native';

function iconFor(type: AppNotification['type']) {
  switch (type) {
    case 'earn': return { Icon: Send, color: '#2D6BFF', bg: '#DBEAFE' };
    case 'withdraw': return { Icon: Wallet, color: '#22C55E', bg: '#DCFCE7' };
    case 'task': return { Icon: FileText, color: '#F97316', bg: '#FFEDD5' };
    case 'refer': return { Icon: Gift, color: '#8B5CF6', bg: '#F3E8FF' };
    default: return { Icon: Bell, color: colors.primary, bg: '#DBEAFE' };
  }
}

export default function Notifications() {
  const renderItem = ({ item }: { item: AppNotification }) => {
    const { Icon, color, bg } = iconFor(item.type);
    return (
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: bg }]}>
          <Icon size={18} color={color} />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.message}>{item.message}</Text>
        </View>
        <Text style={styles.time}>{item.time}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Notifications" />
      <FlatList
        data={mockNotifications}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        contentContainerStyle={{ padding: 6, paddingBottom: 80 }}
      />
      <View style={styles.footer}>
        <Pressable style={styles.clearBtn}>
          <Text style={styles.clearText}>Clear All</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card,
    padding: 10,
  },
  sep: { height: 1, backgroundColor: colors.border },
  icon: { width: 36, height: 36, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.foreground, fontWeight: '700', fontSize: 13 },
  message: { color: colors.mutedForeground, fontSize: 11, marginTop: 1 },
  time: { color: colors.mutedForeground, fontSize: 10 },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0, padding: 6,
    backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border,
  },
  clearBtn: {
    backgroundColor: '#F1F5F9', paddingVertical: 12, borderRadius: 6,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  clearText: { color: colors.foreground, fontWeight: '700', fontSize: 13 },
});
