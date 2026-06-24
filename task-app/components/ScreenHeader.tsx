import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { router } from 'expo-router';
import { colors, fonts } from '@/lib/theme';

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
            <ChevronLeft size={24} color={colors.foreground} />
          </Pressable>
        ) : <View style={styles.iconBtn} />}
        <Text style={styles.title}>{title}</Text>
        <View style={styles.iconBtn}>{right}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.card, paddingHorizontal: 6, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.foreground, fontSize: 16, fontFamily: fonts.heading, flex: 1, textAlign: 'center' },
});
