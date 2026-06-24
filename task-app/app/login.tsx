import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { colors } from '@/lib/theme';
import { Gift } from 'lucide-react-native';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={['#3B5BFF', '#5B3BFF']}
      style={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 }]}
    >
      <View style={styles.top}>
        <Text style={styles.title}>Self Task</Text>
        <Text style={styles.subtitle}>Complete Tasks, Earn Rewards{'\n'}& Get Real Cash</Text>
      </View>
      <View style={styles.illustration}>
        <View style={styles.giftCircle}>
          <Gift size={90} color="#FFFFFF" strokeWidth={1.6} />
        </View>
      </View>
      <View style={styles.actions}>
        <Pressable style={styles.primaryBtn} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.primaryBtnText}>Get Started</Text>
        </Pressable>
        <Pressable style={styles.outlineBtn} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.outlineBtnText}>Login</Text>
        </Pressable>
        <Text style={styles.trust}>✓  Trusted by 50K+ Users</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 6, justifyContent: 'space-between' },
  top: { alignItems: 'center', marginTop: 30 },
  title: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 18 },
  illustration: { alignItems: 'center', justifyContent: 'center' },
  giftCircle: {
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  actions: { paddingHorizontal: 6, gap: 8 },
  primaryBtn: {
    backgroundColor: '#FFFFFF', paddingVertical: 12, borderRadius: 6,
    alignItems: 'center',
  },
  primaryBtnText: { color: colors.primary, fontWeight: '700', fontSize: 15 },
  outlineBtn: {
    paddingVertical: 12, borderRadius: 6, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
  },
  outlineBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  trust: { color: 'rgba(255,255,255,0.85)', textAlign: 'center', fontSize: 12, marginTop: 4 },
});
