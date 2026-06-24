import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, fonts } from '@/lib/theme';
import ScreenHeader from '@/components/ScreenHeader';
import Brand from '@/components/Brand';

export default function AboutUs() {
  return (
    <View style={styles.container}>
      <ScreenHeader title="About us" />
      <ScrollView contentContainerStyle={{ padding: 6, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <View style={{ marginVertical: 10 }}><Brand size={34} /></View>
        <Text style={styles.p}>
          Qizko is a fresh-grocery booking app built to make everyday shopping effortless. Order fruits,
          vegetables, dairy, bakery and pantry staples in a few taps and get them delivered to your door in minutes.
        </Text>
        <Text style={styles.h}>Our mission</Text>
        <Text style={styles.p}>
          To bring farm-fresh quality and honest pricing to every Indian household, with a simple and delightful app experience.
        </Text>
        <Text style={styles.h}>Why Qizko</Text>
        <Text style={styles.p}>• Fresh, quality-checked products{'\n'}• Fast 30-minute delivery{'\n'}• Transparent pricing & easy returns{'\n'}• Friendly customer support</Text>
        <Text style={styles.muted}>Made with care in India 🇮🇳</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  p: { fontSize: 13, color: colors.mutedForeground, fontFamily: fonts.body, lineHeight: 21, marginTop: 6 },
  h: { fontSize: 16, fontFamily: fonts.displayBold, color: colors.foreground, marginTop: 16 },
  muted: { fontSize: 12, color: colors.mutedForeground, fontFamily: fonts.body, marginTop: 20, textAlign: 'center' },
});
