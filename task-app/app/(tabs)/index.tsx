import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, useWindowDimensions, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Search, Bell, MapPin, ChevronRight, Package } from 'lucide-react-native';
import { colors, fonts } from '@/lib/theme';
import Brand from '@/components/Brand';
import { categories, savedPlaces, DeliveryCategory } from '@/lib/mockData';
import { useBooking } from '@/lib/bookingStore';
import { useAuth } from '@/lib/authStore';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const setDraft = useBooking((s) => s.setDraft);
  const bookings = useBooking((s) => s.bookings);
  const name = useAuth((s) => s.name);

  const openWithCategory = (categoryId: string, drop?: string) => {
    setDraft({ categoryId, drop: drop || '' });
    router.push('/book-delivery');
  };

  const recent = bookings.slice(0, 3);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 6 }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Brand size={24} />
        <Pressable onPress={() => router.push('/notifications')} hitSlop={8} style={styles.bellBtn}>
          <Bell size={20} color={colors.foreground} strokeWidth={1.8} />
          <View style={styles.bellDot} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Greeting */}
        <View style={styles.greet}>
          <Text style={styles.hi}>Hey {name === 'Guest' ? 'there' : name.split(' ')[0]} 👋</Text>
          <Text style={styles.headline}>Where do we need{'\n'}to deliver today?</Text>
        </View>

        {/* Where-to card (Uber-style) */}
        <Pressable style={styles.whereCard} onPress={() => openWithCategory('groceries')}>
          <View style={styles.whereRow}>
            <View style={[styles.pinDot, styles.pinPickup]} />
            <View style={styles.whereTextWrap}>
              <Text style={styles.whereLabel}>PICK UP FROM</Text>
              <Text style={styles.wherePlaceholder}>Tap to set pickup location</Text>
            </View>
          </View>
          <View style={styles.whereDivider} />
          <View style={styles.whereRow}>
            <View style={[styles.pinDot, styles.pinDrop]} />
            <View style={styles.whereTextWrap}>
              <Text style={styles.whereLabel}>DELIVER TO</Text>
              <Text style={styles.wherePlaceholder}>Where should the rider drop it?</Text>
            </View>
            <ChevronRight size={18} color={colors.mutedForeground} />
          </View>
          <View style={styles.searchHint}>
            <Search size={14} color={colors.mutedForeground} />
            <Text style={styles.searchHintText}>Search any address or landmark</Text>
          </View>
        </Pressable>

        {/* Categories */}
        <Text style={styles.section}>What do you want to send?</Text>
        <View style={styles.catGrid}>
          {categories.map((c: DeliveryCategory) => (
            <Pressable
              key={c.id}
              style={[styles.catItem, { width: (width - 12 - 12) / 3 }]}
              onPress={() => openWithCategory(c.id)}
            >
              <Text style={styles.catEmoji}>{c.emoji}</Text>
              <Text style={styles.catName}>{c.name}</Text>
              <Text style={styles.catHint} numberOfLines={1}>{c.hint}</Text>
            </Pressable>
          ))}
        </View>

        {/* Saved places */}
        <Text style={styles.section}>Saved places</Text>
        <FlatList
          horizontal
          data={savedPlaces}
          keyExtractor={(p) => p.id}
          showsHorizontalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ width: 6 }} />}
          contentContainerStyle={{ paddingHorizontal: 6 }}
          renderItem={({ item }) => (
            <Pressable style={styles.placeChip} onPress={() => openWithCategory('parcel', item.address)}>
              <Text style={styles.placeEmoji}>{item.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.placeLabel}>{item.label}</Text>
                <Text style={styles.placeAddr} numberOfLines={1}>{item.address}</Text>
              </View>
            </Pressable>
          )}
        />

        {/* Recent bookings */}
        <View style={styles.recentHead}>
          <Text style={styles.section}>Recent activity</Text>
          <Pressable onPress={() => router.push('/(tabs)/activity')} hitSlop={6}>
            <Text style={styles.viewAll}>View all</Text>
          </Pressable>
        </View>
        {recent.length === 0 ? (
          <View style={styles.emptyRecent}>
            <Package size={28} color={colors.mutedForeground} strokeWidth={1.5} />
            <Text style={styles.emptyText}>No bookings yet. Book your first delivery above.</Text>
          </View>
        ) : (
          <View>
            {recent.map((b, i) => (
              <Pressable
                key={b.id}
                style={[styles.recentRow, i === recent.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => router.push({ pathname: '/booking-details', params: { id: b.id } })}
              >
                <View style={styles.recentIcon}>
                  <Text style={{ fontSize: 18 }}>
                    {categories.find((c) => c.id === b.categoryId)?.emoji || '📦'}
                  </Text>
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.recentRoute} numberOfLines={1}>
                    {b.pickup} → {b.drop}
                  </Text>
                  <View style={styles.recentMetaRow}>
                    <MapPin size={11} color={colors.mutedForeground} />
                    <Text style={styles.recentMeta}>{b.distanceKm.toFixed(1)} km · {b.status}</Text>
                  </View>
                </View>
                <Text style={styles.recentPrice}>₹{b.price}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: { paddingHorizontal: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bellBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  bellDot: { position: 'absolute', top: 7, right: 8, width: 6, height: 6, backgroundColor: colors.accent },

  greet: { paddingHorizontal: 6, paddingTop: 10 },
  hi: { fontSize: 13, color: colors.mutedForeground, fontFamily: fonts.body },
  headline: { fontSize: 24, fontFamily: fonts.displayBold, color: colors.foreground, marginTop: 4, lineHeight: 30, letterSpacing: -0.5 },

  whereCard: {
    marginHorizontal: 6, marginTop: 12, borderWidth: 1, borderColor: colors.foreground,
    backgroundColor: colors.card, borderRadius: 0, padding: 10,
  },
  whereRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  whereTextWrap: { flex: 1 },
  whereLabel: { fontSize: 9, letterSpacing: 1.2, fontFamily: fonts.bodyBold, color: colors.mutedForeground },
  wherePlaceholder: { fontSize: 13, fontFamily: fonts.body, color: colors.foreground, marginTop: 2 },
  pinDot: { width: 10, height: 10, marginLeft: 2 },
  pinPickup: { backgroundColor: colors.accent },
  pinDrop: { backgroundColor: colors.foreground },
  whereDivider: { height: 1, backgroundColor: colors.divider, marginVertical: 2, marginLeft: 22 },
  searchHint: {
    flexDirection: 'row', alignItems: 'center', gap: 6, borderTopWidth: 1, borderTopColor: colors.divider,
    marginTop: 6, paddingTop: 8,
  },
  searchHintText: { fontSize: 12, color: colors.mutedForeground, fontFamily: fonts.body },

  section: { fontSize: 13, fontFamily: fonts.bodyBold, color: colors.foreground, paddingHorizontal: 6, marginTop: 18, marginBottom: 8, letterSpacing: 0.2 },

  catGrid: { paddingHorizontal: 6, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  catItem: {
    borderWidth: 1, borderColor: colors.border, padding: 10, alignItems: 'flex-start',
    backgroundColor: colors.card, borderRadius: 0,
  },
  catEmoji: { fontSize: 22 },
  catName: { fontSize: 13, fontFamily: fonts.heading, color: colors.foreground, marginTop: 4 },
  catHint: { fontSize: 10, color: colors.mutedForeground, fontFamily: fonts.body, marginTop: 1 },

  placeChip: {
    width: 220, flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: colors.border, padding: 8, backgroundColor: colors.card, borderRadius: 0,
  },
  placeEmoji: { fontSize: 22 },
  placeLabel: { fontSize: 13, fontFamily: fonts.bodyBold, color: colors.foreground },
  placeAddr: { fontSize: 11, fontFamily: fonts.body, color: colors.mutedForeground, marginTop: 1 },

  recentHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingRight: 6 },
  viewAll: { fontSize: 12, fontFamily: fonts.bodyBold, color: colors.foreground, textDecorationLine: 'underline' },
  emptyRecent: { alignItems: 'center', paddingVertical: 24, gap: 6, paddingHorizontal: 24 },
  emptyText: { fontSize: 12, color: colors.mutedForeground, fontFamily: fonts.body, textAlign: 'center' },
  recentRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 6,
    borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  recentIcon: {
    width: 36, height: 36, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
    borderRadius: 0, backgroundColor: colors.card,
  },
  recentRoute: { fontSize: 13, fontFamily: fonts.bodyBold, color: colors.foreground },
  recentMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  recentMeta: { fontSize: 11, color: colors.mutedForeground, fontFamily: fonts.body },
  recentPrice: { fontSize: 14, fontFamily: fonts.displayBold, color: colors.foreground },
});
