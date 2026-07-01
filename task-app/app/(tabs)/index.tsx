import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, useWindowDimensions, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  Search, Bell, ChevronRight, Clock, Zap,
  Home as HomeIcon, Building2, Heart, Bookmark, LucideIcon,
} from 'lucide-react-native';
import { colors, fonts, radius } from '@/lib/theme';
import Brand from '@/components/Brand';
import ServiceToggle from '@/components/ServiceToggle';
import AssetIcon from '@/components/AssetIcon';
import { categories, savedPlaces, DeliveryCategory } from '@/lib/mockData';
import { useBooking } from '@/lib/bookingStore';
import { useServiceMode, rideOptions } from '@/lib/serviceMode';

const PLACE_ICON: Record<string, LucideIcon> = {
  home: HomeIcon,
  office: Building2,
  mom: Heart,
};

// Faux ETAs so the ride list feels alive without a live backend.
const RIDE_META: Record<string, { eta: string; tag?: string }> = {
  bike: { eta: '2 min away', tag: 'Fastest' },
  auto: { eta: '4 min away' },
  cab: { eta: '3 min away' },
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const setDraft = useBooking((s) => s.setDraft);
  const draft = useBooking((s) => s.draft);
  const mode = useServiceMode((s) => s.mode);
  const setMode = useServiceMode((s) => s.setMode);
  const [selectedRide, setSelectedRide] = React.useState<string>(rideOptions[0].id);

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

  const tileWidth = (width - 12 - 6) / 2;

  return (
    <View style={styles.container}>
      {/* Sand Dune header band — brand, bell, and service tabs live here */}
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <View style={styles.topBar}>
          <Brand size={24} />
          <Pressable onPress={() => router.push('/notifications')} hitSlop={8} style={styles.bellBtn}>
            <Bell size={16} color={colors.primary} strokeWidth={2} />
            <View style={styles.bellDot} />
          </Pressable>
        </View>
        <View style={styles.toggleWrap}>
          <ServiceToggle value={mode} onChange={(m) => { setMode(m); setDraft({ mode: m }); }} />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>


        {/* "Where to?" primary CTA */}
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

        {/* Saved places — quick chips */}
        <FlatList
          horizontal
          data={savedPlaces}
          keyExtractor={(p) => p.id}
          showsHorizontalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ width: 6 }} />}
          contentContainerStyle={styles.placesRow}
          renderItem={({ item }) => {
            const PIcon = PLACE_ICON[item.id] || Bookmark;
            return (
              <Pressable style={styles.placeChip} onPress={() => openWithCategory(mode === 'ride' ? selectedRide : 'parcel', item.address)}>
                <PIcon size={13} color={colors.foreground} strokeWidth={1.8} />
                <Text style={styles.placeLabel}>{item.label}</Text>
              </Pressable>
            );
          }}
        />

        {mode === 'ride' ? (
          <>
            <Text style={styles.section}>Choose a ride</Text>
            <View style={styles.rideList}>
              {rideOptions.map((r) => {
                const meta = RIDE_META[r.id];
                const isSelected = selectedRide === r.id;
                return (
                  <Pressable
                    key={r.id}
                    onPress={() => setSelectedRide(r.id)}
                    onLongPress={() => openWithCategory(r.id)}
                    style={[
                      isSelected ? styles.rideCardSelected : styles.rideCard,
                    ]}
                  >
                    <View style={styles.rideArt}>
                      <AssetIcon id={r.id} size={isSelected ? 60 : 44} />
                    </View>
                    <View style={styles.rideBody}>
                      <View style={styles.rideHeadRow}>
                        <Text style={styles.rideName}>{r.name}</Text>
                        <Text style={styles.rideCap}> · {r.capacity}</Text>
                      </View>
                      <View style={styles.rideMetaRow}>
                        <Clock size={10} color={colors.mutedForeground} strokeWidth={2} />
                        <Text style={styles.rideHint}>{meta?.eta || `${r.perKm}/km`}</Text>
                        {meta?.tag ? (
                          <View style={styles.fastTag}>
                            <Zap size={9} color={colors.accent} strokeWidth={2.4} />
                            <Text style={styles.fastTagText}>{meta.tag}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                    <Text style={styles.ridePrice}>₹{r.base}+</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Confirm CTA — mirrors reference "Choose UberX" pattern */}
            <Pressable style={styles.confirmBtn} onPress={() => openWithCategory(selectedRide)}>
              <Text style={styles.confirmText}>
                Choose {rideOptions.find((r) => r.id === selectedRide)?.name}
              </Text>
            </Pressable>
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
                  <View style={styles.tileArt}>
                    <AssetIcon id={c.id} size={56} />
                  </View>
                  <View style={styles.tileBody}>
                    <Text style={styles.tileName}>{c.name}</Text>
                    <Text style={styles.tileHint} numberOfLines={1}>{c.hint}</Text>
                  </View>
                  <ChevronRight size={14} color={colors.mutedForeground} />
                </Pressable>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Sand Dune header band
  header: {
    backgroundColor: colors.headerBg,
    paddingHorizontal: 6,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bellBtn: {
    width: 34, height: 34, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border, backgroundColor: '#FFFFFF',
    borderRadius: radius.pill,
  },
  bellDot: { position: 'absolute', top: 8, right: 9, width: 6, height: 6, backgroundColor: colors.accent, borderRadius: radius.pill },

  toggleWrap: { marginTop: 10 },

  whereBtn: {
    marginHorizontal: 6, marginTop: 12,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingHorizontal: 12, paddingVertical: 12,
  },
  whereIcon: {
    width: 32, height: 32, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(240,237,229,0.2)', borderRadius: radius.sm,
  },
  whereTitle: { fontSize: 14, fontFamily: fonts.displayBold, color: colors.primaryForeground },
  whereSub: { fontSize: 11, fontFamily: fonts.body, color: 'rgba(240,237,229,0.75)', marginTop: 2 },

  placesRow: { paddingHorizontal: 6, paddingTop: 10 },
  placeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill,
  },
  placeLabel: { fontSize: 12, fontFamily: fonts.bodyBold, color: colors.foreground },

  section: {
    fontSize: 12, fontFamily: fonts.bodyBold, color: colors.mutedForeground,
    paddingHorizontal: 6, marginTop: 14, marginBottom: 6,
    letterSpacing: 0.6, textTransform: 'uppercase',
  },

  // Rides list — selected card is highlighted with Cyprus border.
  rideList: { paddingHorizontal: 6, gap: 6 },
  rideCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card,
    borderRadius: radius.md, paddingVertical: 8, paddingHorizontal: 10,
  },
  rideCardSelected: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.card,
    borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 10,

  },
  rideArt: {
    width: 66, height: 52, alignItems: 'center', justifyContent: 'center',
  },
  rideBody: { flex: 1, gap: 2 },
  rideHeadRow: { flexDirection: 'row', alignItems: 'baseline' },
  rideName: { fontSize: 15, fontFamily: fonts.displayBold, color: colors.foreground },
  rideCap: { fontSize: 11, fontFamily: fonts.body, color: colors.mutedForeground },
  rideMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rideHint: { fontSize: 11, color: colors.mutedForeground, fontFamily: fonts.body },
  fastTag: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    borderWidth: 1, borderColor: colors.accent, paddingHorizontal: 4, paddingVertical: 1,
    marginLeft: 4, borderRadius: radius.sm,
  },
  fastTagText: { fontSize: 9, fontFamily: fonts.bodyBold, color: colors.accent, letterSpacing: 0.2 },
  ridePrice: { fontSize: 14, fontFamily: fonts.displayBold, color: colors.foreground },

  confirmBtn: {
    marginHorizontal: 6, marginTop: 14,
    backgroundColor: colors.primary, borderRadius: radius.pill,
    paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
  },
  confirmText: { color: colors.primaryForeground, fontSize: 14, fontFamily: fonts.displayBold, letterSpacing: 0.4 },


  // Delivery — dense list-style rows in a 2-col grid.
  tileGrid: { paddingHorizontal: 6, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tile: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 8, paddingHorizontal: 8,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card,
    borderRadius: radius.md,
  },
  tileArt: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  tileBody: { flex: 1 },
  tileName: { fontSize: 13, fontFamily: fonts.displayBold, color: colors.foreground },
  tileHint: { fontSize: 10, color: colors.mutedForeground, fontFamily: fonts.body, marginTop: 1 },
});
