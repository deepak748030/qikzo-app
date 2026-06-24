import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { CheckCircle2 } from 'lucide-react-native';
import { colors, fonts } from '@/lib/theme';
import Button from '@/components/Button';

export default function OrderSuccess() {
  const insets = useSafeAreaInsets();
  const { total } = useLocalSearchParams<{ total: string }>();
  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.body}>
        <View style={styles.iconWrap}><CheckCircle2 size={48} color={colors.success} /></View>
        <Text style={styles.title}>Order placed!</Text>
        <Text style={styles.sub}>Your order of ₹{total} has been confirmed and will be delivered within 30 minutes.</Text>
        <View style={styles.eta}>
          <Text style={styles.etaLabel}>Estimated delivery</Text>
          <Text style={styles.etaValue}>30 min</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Button label="Track my order" onPress={() => router.replace('/(tabs)/orders')} />
        <Button label="Continue shopping" variant="outline" onPress={() => router.replace('/(tabs)')} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 6 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconWrap: { width: 88, height: 88, borderWidth: 1.5, borderColor: colors.success, alignItems: 'center', justifyContent: 'center', borderRadius: 0 },
  title: { fontSize: 24, fontFamily: fonts.displayBold, color: colors.foreground, marginTop: 18 },
  sub: { fontSize: 14, color: colors.mutedForeground, fontFamily: fonts.body, textAlign: 'center', marginTop: 8, lineHeight: 20, paddingHorizontal: 16 },
  eta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 10, marginTop: 20, width: '100%', borderRadius: 0 },
  etaLabel: { fontSize: 13, color: colors.mutedForeground, fontFamily: fonts.body },
  etaValue: { fontSize: 15, fontFamily: fonts.displayBold, color: colors.foreground },
  actions: { width: '100%' },
});
