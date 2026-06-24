import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { router } from 'expo-router';
import { colors } from '@/lib/theme';

type Props = {
  title: string;
  showBack?: boolean;
  right?: React.ReactNode;
};

export default function ScreenHeader({ title, showBack = true, right }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 8 }]}>
      <View style={styles.row}>
        {showBack ? (
          <Pressable onPress={() => router.back()} style={styles.iconBtn} hitSlop={10}>
            <ChevronLeft size={24} color="#FFFFFF" />
          </Pressable>
        ) : <View style={styles.iconBtn} />}
        <Text style={styles.title}>{title}</Text>
        <View style={styles.iconBtn}>{right}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.primary, paddingHorizontal: 6, paddingBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#FFFFFF', fontSize: 17, fontWeight: '700', flex: 1, textAlign: 'center' },
});
