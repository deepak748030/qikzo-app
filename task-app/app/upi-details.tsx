import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator, ScrollView, FlatList } from 'react-native';
import ScreenHeader from '@/components/ScreenHeader';
import BottomSheet from '@/components/BottomSheet';
import { colors } from '@/lib/theme';
import { Smartphone, Trash2 } from 'lucide-react-native';
import { router } from 'expo-router';

type Upi = { id: string; name: string; vpa: string; primary?: boolean };

const INITIAL: Upi[] = [
  { id: '1', name: 'Google Pay', vpa: 'rahul@okicici', primary: true },
  { id: '2', name: 'PhonePe', vpa: 'rahul@ybl' },
];

export default function UpiDetailsScreen() {
  const [list, setList] = useState<Upi[]>(INITIAL);
  const [name, setName] = useState('');
  const [vpa, setVpa] = useState('');
  const [loading, setLoading] = useState(false);
  const [sheet, setSheet] = useState(false);

  const onAdd = () => {
    if (!name || !vpa.includes('@')) return;
    setLoading(true);
    setTimeout(() => {
      setList((prev) => [...prev, { id: String(Date.now()), name, vpa }]);
      setName(''); setVpa('');
      setLoading(false);
      setSheet(true);
    }, 700);
  };

  const remove = (id: string) => setList((prev) => prev.filter((u) => u.id !== id));
  const setPrimary = (id: string) => setList((prev) => prev.map((u) => ({ ...u, primary: u.id === id })));

  const renderItem = ({ item }: { item: Upi }) => (
    <Pressable style={styles.row} onPress={() => setPrimary(item.id)}>
      <View style={styles.iconBox}><Smartphone size={16} color={colors.primary} /></View>
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.vpa}>{item.vpa}</Text>
      </View>
      {item.primary && <View style={styles.pill}><Text style={styles.pillText}>Primary</Text></View>}
      <Pressable hitSlop={10} onPress={() => remove(item.id)} style={{ marginLeft: 8 }}>
        <Trash2 size={16} color={colors.danger} />
      </Pressable>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="UPI Details" />
      <FlatList
        data={list}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        contentContainerStyle={{ padding: 6, paddingBottom: 24 }}
        ListHeaderComponent={
          <View>
            <View style={styles.headCard}>
              <View style={styles.iconWrap}><Smartphone size={22} color="#FFFFFF" /></View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.headTitle}>UPI Accounts</Text>
                <Text style={styles.headSub}>Tap to set as primary</Text>
              </View>
            </View>

            <View style={styles.formCard}>
              <Text style={styles.label}>App Name</Text>
              <TextInput
                value={name} onChangeText={setName} placeholder="e.g. Google Pay"
                placeholderTextColor={colors.mutedForeground} style={styles.input}
              />
              <Text style={[styles.label, { marginTop: 6 }]}>UPI ID (VPA)</Text>
              <TextInput
                value={vpa} onChangeText={setVpa} placeholder="yourname@bank"
                placeholderTextColor={colors.mutedForeground} style={styles.input}
                autoCapitalize="none"
              />
              <Pressable style={styles.cta} onPress={onAdd} disabled={loading}>
                {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.ctaText}>Add UPI</Text>}
              </Pressable>
            </View>

            <Text style={styles.section}>Saved UPI IDs</Text>
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>No UPI added yet</Text>}
      />

      <BottomSheet
        visible={sheet} variant="success" title="UPI Added"
        message="Your UPI ID has been saved." confirmText="Done" onClose={() => setSheet(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary,
    borderRadius: 6, padding: 12, marginTop: 4,
  },
  iconWrap: {
    width: 44, height: 44, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  headTitle: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  headSub: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 1 },
  formCard: {
    backgroundColor: colors.card, borderRadius: 6, borderWidth: 1, borderColor: colors.border,
    padding: 10, marginTop: 6,
  },
  label: { color: colors.foreground, fontSize: 12, fontWeight: '600', marginBottom: 4 },
  input: {
    backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.inputBorder,
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8, color: colors.foreground, fontSize: 13,
  },
  cta: { marginTop: 8, backgroundColor: colors.primary, paddingVertical: 10, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  section: { color: colors.foreground, fontWeight: '700', fontSize: 13, marginTop: 10, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, padding: 10 },
  iconBox: { width: 32, height: 32, borderRadius: 6, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
  name: { color: colors.foreground, fontWeight: '700', fontSize: 13 },
  vpa: { color: colors.mutedForeground, fontSize: 11, marginTop: 1 },
  pill: { backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  pillText: { color: colors.success, fontSize: 10, fontWeight: '700' },
  sep: { height: 1, backgroundColor: colors.border },
  empty: { textAlign: 'center', color: colors.mutedForeground, marginTop: 20 },
});
