import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, useWindowDimensions, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  Search, Bell, ChevronRight, MapPin,
  Home as HomeIcon, Building2, Heart, Bookmark, LucideIcon,
} from 'lucide-react-native';
import { colors, fonts, radius } from '@/lib/theme';
import Brand from '@/components/Brand';
import ServiceToggle from '@/components/ServiceToggle';
import AssetIcon from '@/components/AssetIcon';
import { categories, savedPlaces, DeliveryCategory } from '@/lib/mockData';
import { useBooking } from '@/lib/bookingStore';
import { useServiceMode, rideOptions } from '@/lib/serviceMode';

// Saved place chip icons stay as small line icons — they're UI chrome, not hero art.
const PLACE_ICON: Record<string, LucideIcon> = {
  home: HomeIcon,
  office: Building2,
  mom: Heart,
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const setDraft = useBooking((s) => s.setDraft);
  const draft = useBooking((s) => s.draft);
  const bookings = useBooking((s) => s.bookings);
  const mode = useServiceMode((s) => s.mode);
  const setMode = useServiceMode((s) => s.setMode);

  // IMPORTANT: only patch the fields we actually want to change.
  // Passing `drop: ''` here would wipe a drop the user already pinned on the map,
  // forcing them back into location selection — that's the bug we're fixing.
  const openWithCategory = (categoryId: string, drop?: string) => {
    const patch: Parameters<typeof setDraft>[0] = { mode, categoryId };
    if (drop) patch.drop = drop;
    setDraft(patch);
    router.push('/book-delivery');
  };

  const openMap = (field: 'pickup' | 'drop') => {
    setDraft({ mode });
    router.push({ pathname: '/select-location', params: { field } });
  };

  const recent = bookings.slice(0, 3);
  const tileWidth = (width - 12 - 6) / 2; // 2-col grid, 6 horizontal pad + 6 gap

  return (
    <View style={[styles.container, { paddingTop: insets.top + 6 }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Brand size={24} />
        <Pressable onPress={() => router.push('/notifications')} hitSlop={8} style={styles.bellBtn}>
          <Bell size={18} color={colors.foreground} strokeWidth={1.8} />
          <View style={styles.bellDot} />
        </Pressable>
      </View>

      {/* Service toggle (Rides | Delivery) */}
      <View style={styles.toggleWrap}>
        <ServiceToggle value={mode} onChange={(m) => { setMode(m); setDraft({ mode: m }); }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>

        {/* Search-style "Where to?" trigger — single primary CTA, no clutter */}
        <Pressable style={styles.whereBtn} onPress={() => openMap('drop')}>
          <View style={styles.whereIcon}>
            <Search size={16} color={colors.primaryForeground} strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.whereTitle} numberOfLines={1}>
              {draft.drop || (mode === 'ride' ? 'Where are you going?' : 'Where to deliver?')}
            </Text>
            <Text style={styles.whereSub} numberOfLines={1}>
              {draft.pickup ? `From ${draft.pickup}` : 'Tap to set pickup & drop'}
            </Text>
          </View>
          <ChevronRight size={18} color={'rgba(255,255,255,0.9)'} />
        </Pressable>

        {/* Mode-specific hero cards with big illustrations */}
        {mode === 'ride' ? (
          <>
            <Text style={styles.section}>Choose your ride</Text>
            <View style={styles.rideList}>
              {rideOptions.map((r) => (
                <Pressable key={r.id} style={styles.rideCard} onPress={() => openWithCategory(r.id)}>
                  <View style={styles.rideArt}>
                    <AssetIcon id={r.id} size={68} />
                  </View>
                  <View style={styles.rideBody}>
                    <View style={styles.rideHead}>
                      <Text style={styles.rideName}>{r.name}</Text>
                      <Text style={styles.ridePrice}>₹{r.base}+</Text>
                    </View>
                    <Text style={styles.rideHint} numberOfLines={1}>{r.hint}</Text>
                    <Text style={styles.rideCap}>{r.capacity} · ₹{r.perKm}/km</Text>
                  </View>
                  <ChevronRight size={16} color={colors.mutedForeground} />
                </Pressable>
              ))}
            </View>
          </>
        ) : (
          <>
            <Text style={styles.section}>What do you want to send?</Text>
            <View style={styles.tileGrid}>
              {categories.map((c: DeliveryCategory) => (
                <Pressable
                  key={c.id}
                  style={[styles.tile, { width: tileWidth }]}
                  onPress={() => openWithCategory(c.id)}
                >
                  <AssetIcon id={c.id} size={64} />
                  <Text style={styles.tileName}>{c.name}</Text>
                  <Text style={styles.tileHint} numberOfLines={1}>{c.hint}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {/* Saved places */}
        <Text style={styles.section}>Saved places</Text>
        <FlatList
          horizontal
          data={savedPlaces}
          keyExtractor={(p) => p.id}
          showsHorizontalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ width: 6 }} />}
          contentContainerStyle={{ paddingHorizontal: 6 }}
          renderItem={({ item }) => {
            const PIcon = PLACE_ICON[item.id] || Bookmark;
            return (
              <Pressable style={styles.placeChip} onPress={() => openWithCategory(mode === 'ride' ? 'bike' : 'parcel', item.address)}>
                <View style={styles.placeIconChip}>
                  <PIcon size={16} color={colors.foreground} strokeWidth={1.8} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.placeLabel}>{item.label}</Text>
                  <Text style={styles.placeAddr} numberOfLines={1}>{item.address}</Text>
                </View>
              </Pressable>
            );
          }}
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
            <AssetIcon id="parcel" size={56} />
            <Text style={styles.emptyText}>No bookings yet. Pick a destination above to begin.</Text>
          </View>
        ) : (
          <View>
            {recent.map((b, i) => {
              return (
                <Pressable
                  key={b.id}
                  style={[styles.recentRow, i === recent.length - 1 && { borderBottomWidth: 0 }]}
                  onPress={() => router.push({ pathname: '/booking-details', params: { id: b.id } })}
                >
                  <AssetIcon id={b.categoryId} size={40} />
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
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: { paddingHorizontal: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bellBtn: {
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
  },
  bellDot: { position: 'absolute', top: 7, right: 8, width: 6, height: 6, backgroundColor: colors.accent, borderRadius: radius.sm },

  toggleWrap: { marginTop: 10, borderBottomWidth: 1, borderBottomColor: colors.border },

  // "Where to?" hero CTA — one primary action, no map clutter.
  whereBtn: {
    marginHorizontal: 6, marginTop: 12,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingHorizontal: 12, paddingVertical: 12,
  },
  whereIcon: {
    width: 34, height: 34, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: radius.sm,
  },
  whereTitle: { fontSize: 14, fontFamily: fonts.displayBold, color: '#FFFFFF' },
  whereSub: { fontSize: 11, fontFamily: fonts.body, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  section: { fontSize: 13, fontFamily: fonts.bodyBold, color: colors.foreground, paddingHorizontal: 6, marginTop: 18, marginBottom: 8, letterSpacing: 0.2 },

  // Ride cards — big illustration on the left, meta on the right.
  rideList: { paddingHorizontal: 6, gap: 6 },
  rideCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card,
    borderRadius: radius.md, paddingVertical: 8, paddingHorizontal: 10,
  },
  rideArt: {
    width: 72, height: 72, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.chipBg, borderRadius: radius.sm,
  },
  rideBody: { flex: 1 },
  rideHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  rideName: { fontSize: 15, fontFamily: fonts.displayBold, color: colors.foreground },
  ridePrice: { fontSize: 13, fontFamily: fonts.bodyBold, color: colors.accent },
  rideHint: { fontSize: 11, color: colors.mutedForeground, fontFamily: fonts.body, marginTop: 2 },
  rideCap: { fontSize: 10, color: colors.mutedForeground, fontFamily: fonts.body, marginTop: 2 },

  // Delivery tiles — 2 col grid of big illustrations.
  tileGrid: { paddingHorizontal: 6, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tile: {
    alignItems: 'center', paddingVertical: 14, paddingHorizontal: 8,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card,
    borderRadius: radius.md,
  },
  tileName: { fontSize: 13, fontFamily: fonts.displayBold, color: colors.foreground, marginTop: 6 },
  tileHint: { fontSize: 10, color: colors.mutedForeground, fontFamily: fonts.body, marginTop: 2 },

  placeChip: {
    width: 210, flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: colors.border, padding: 8, backgroundColor: colors.card, borderRadius: radius.md,
  },
  placeIconChip: {
    width: 30, height: 30, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.chipBg,
    alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm,
  },
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
  recentRoute: { fontSize: 13, fontFamily: fonts.bodyBold, color: colors.foreground },
  recentMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  recentMeta: { fontSize: 11, color: colors.mutedForeground, fontFamily: fonts.body },
  recentPrice: { fontSize: 14, fontFamily: fonts.displayBold, color: colors.foreground },
});
