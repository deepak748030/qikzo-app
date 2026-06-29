import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, useWindowDimensions, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import {
  Search, Bell, MapPin, ChevronRight, Package, Navigation,
  ShoppingCart, UtensilsCrossed, Pill, Sparkles, Bike, Car, Truck,
  Home as HomeIcon, Building2, Heart, Bookmark, LucideIcon,
} from 'lucide-react-native';
import { colors, fonts, radius } from '@/lib/theme';
import Brand from '@/components/Brand';
import ServiceToggle from '@/components/ServiceToggle';
import LeafletMap from '@/components/LeafletMap';
import AnimatedIcon from '@/components/AnimatedIcon';
import { categories, savedPlaces, DeliveryCategory } from '@/lib/mockData';
import { useBooking } from '@/lib/bookingStore';
import { useAuth } from '@/lib/authStore';
import { useServiceMode, rideOptions } from '@/lib/serviceMode';

const DEFAULT_CENTER = { lat: 28.6139, lng: 77.209 };

// Lucide icon mapping replaces emoji per category / ride option / saved place.
const CATEGORY_ICON: Record<string, LucideIcon> = {
  groceries: ShoppingCart,
  food: UtensilsCrossed,
  medicines: Pill,
  parcel: Package,
  other: Sparkles,
};

const RIDE_ICON: Record<string, LucideIcon> = {
  bike: Bike,
  auto: Car,
  cab: Car,
  parcel: Truck,
};

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
  const name = useAuth((s) => s.name);
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
    // Don't reset existing pickup/drop here — just remember the active mode.
    setDraft({ mode });
    router.push({ pathname: '/select-location', params: { field } });
  };

  const recent = bookings.slice(0, 3);
  const [myLoc, setMyLoc] = useState<{ lat: number; lng: number } | null>(null);

  // Auto-detect current location for the home map preview (silent — no prompts on home).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        let granted = status === 'granted';
        if (!granted) {
          const req = await Location.requestForegroundPermissionsAsync();
          granted = req.status === 'granted';
        }
        if (!granted) return;
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (cancelled) return;
        const coord = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        setMyLoc(coord);
        if (!draft.pickupCoord) setDraft({ pickupCoord: coord });
      } catch { }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mapCenter = draft.pickupCoord || myLoc || DEFAULT_CENTER;
  const mapPickup = draft.pickupCoord || myLoc || undefined;


  return (
    <View style={[styles.container, { paddingTop: insets.top + 6 }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Brand size={24} />
        <Pressable onPress={() => router.push('/notifications')} hitSlop={8} style={styles.bellBtn}>
          <AnimatedIcon Icon={Bell} size={20} color={colors.foreground} variant="bounce" strokeWidth={1.8} />
          <View style={styles.bellDot} />
        </Pressable>
      </View>

      {/* Service toggle (Rides | Delivery) */}
      <View style={styles.toggleWrap}>
        <ServiceToggle value={mode} onChange={(m) => { setMode(m); setDraft({ mode: m }); }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>


        {/* Live map preview */}
        <View style={styles.mapBox}>
          <LeafletMap
            center={mapCenter}
            pickup={mapPickup}
            drop={draft.dropCoord || undefined}
            style={{ height: 170 }}
          />
          <Pressable style={styles.mapOverlayBtn} onPress={() => openMap('pickup')} hitSlop={6}>
            <AnimatedIcon Icon={Navigation} size={12} color={colors.foreground} variant="pulse" />
            <Text style={styles.mapOverlayText}>Use my location</Text>
          </Pressable>
          <View style={styles.mapPingWrap} pointerEvents="none">
            <AnimatedIcon Icon={MapPin} size={22} color={colors.accent} variant="ping" ringColor={colors.accent} strokeWidth={2.2} />
          </View>
        </View>

        {/* Where-to card — green primary surface like reference "My Location" card */}
        <View style={styles.whereCard}>
          <Pressable style={styles.whereRow} onPress={() => openMap('pickup')}>
            <View style={styles.whereIconChip}>
              <MapPin size={14} color={colors.primary} strokeWidth={2.2} />
            </View>
            <View style={styles.whereTextWrap}>
              <Text style={styles.whereLabel}>PICK UP FROM</Text>
              <Text style={[styles.wherePlaceholder, !draft.pickup && styles.muted]} numberOfLines={1}>
                {draft.pickup || 'Tap to set pickup location'}
              </Text>
            </View>
            <ChevronRight size={16} color={'rgba(255,255,255,0.7)'} />
          </Pressable>
          <View style={styles.whereDivider} />
          <Pressable style={styles.whereRow} onPress={() => openMap('drop')}>
            <View style={styles.whereIconChip}>
              <HomeIcon size={14} color={colors.primary} strokeWidth={2.2} />
            </View>
            <View style={styles.whereTextWrap}>
              <Text style={styles.whereLabel}>{mode === 'ride' ? 'GOING TO' : 'DELIVER TO'}</Text>
              <Text style={[styles.wherePlaceholder, !draft.drop && styles.muted]} numberOfLines={1}>
                {draft.drop || (mode === 'ride' ? 'Where are you headed?' : 'Where should the rider drop it?')}
              </Text>
            </View>
            <ChevronRight size={16} color={'rgba(255,255,255,0.7)'} />
          </Pressable>
          <View style={styles.searchHint}>
            <Search size={14} color={'rgba(255,255,255,0.85)'} />
            <Text style={styles.searchHintText}>Search any address, landmark or area</Text>
          </View>
        </View>

        {/* Mode-specific section */}
        {mode === 'ride' ? (
          <>
            <Text style={styles.section}>Choose your ride</Text>
            <View style={styles.catGrid}>
              {rideOptions.map((r) => {
                const RIcon = RIDE_ICON[r.id] || Bike;
                return (
                  <Pressable
                    key={r.id}
                    style={[styles.catItem, { width: (width - 12 - 12) / 3 }]}
                    onPress={() => openWithCategory(r.id)}
                  >
                    <View style={styles.catIconChip}>
                      <RIcon size={20} color={colors.foreground} strokeWidth={1.8} />
                    </View>
                    <Text style={styles.catName}>{r.name}</Text>
                    <Text style={styles.catHint} numberOfLines={1}>{r.hint}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : (
          <>
            <Text style={styles.section}>What do you want to send?</Text>
            <View style={styles.catGrid}>
              {categories.map((c: DeliveryCategory) => {
                const CIcon = CATEGORY_ICON[c.id] || Package;
                return (
                  <Pressable
                    key={c.id}
                    style={[styles.catItem, { width: (width - 12 - 12) / 3 }]}
                    onPress={() => openWithCategory(c.id)}
                  >
                    <View style={styles.catIconChip}>
                      <CIcon size={20} color={colors.foreground} strokeWidth={1.8} />
                    </View>
                    <Text style={styles.catName}>{c.name}</Text>
                    <Text style={styles.catHint} numberOfLines={1}>{c.hint}</Text>
                  </Pressable>
                );
              })}
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
                  <PIcon size={18} color={colors.foreground} strokeWidth={1.8} />
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
            <View style={styles.emptyIconWrap}>
              <AnimatedIcon Icon={Package} size={28} color={colors.foreground} variant="bounce" strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyText}>No bookings yet. Pick a destination above to begin.</Text>
          </View>
        ) : (
          <View>
            {recent.map((b, i) => {
              const RIcon =
                CATEGORY_ICON[b.categoryId] || RIDE_ICON[b.categoryId] || Package;
              return (
                <Pressable
                  key={b.id}
                  style={[styles.recentRow, i === recent.length - 1 && { borderBottomWidth: 0 }]}
                  onPress={() => router.push({ pathname: '/booking-details', params: { id: b.id } })}
                >
                  <View style={styles.recentIcon}>
                    <RIcon size={18} color={colors.foreground} strokeWidth={1.8} />
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

  greet: { paddingHorizontal: 6, paddingTop: 10 },
  hi: { fontSize: 13, color: colors.mutedForeground, fontFamily: fonts.body },
  headline: { fontSize: 22, fontFamily: fonts.displayBold, color: colors.foreground, marginTop: 4, lineHeight: 28, letterSpacing: -0.5 },

  // Banners and full-bleed elements stick to the screen edges.
  mapBox: {
    marginTop: 12,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border,
    backgroundColor: '#f3f3f3', position: 'relative',
  },
  mapOverlayBtn: {
    position: 'absolute', right: 8, bottom: 8,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.foreground,
    paddingHorizontal: 8, paddingVertical: 5, borderRadius: radius.sm,
  },
  mapOverlayText: { fontSize: 11, fontFamily: fonts.bodyBold, color: colors.foreground },
  mapPingWrap: {
    position: 'absolute', top: '50%', left: '50%',
    marginLeft: -11, marginTop: -11,
  },

  whereCard: {
    marginHorizontal: 6, marginTop: 12, borderWidth: 0,
    backgroundColor: colors.primary, borderRadius: 0, padding: 12,
  },
  whereRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  whereIconChip: {
    width: 28, height: 28, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 0,
  },
  whereTextWrap: { flex: 1 },
  whereLabel: { fontSize: 9, letterSpacing: 1.2, fontFamily: fonts.bodyBold, color: 'rgba(255,255,255,0.75)' },
  wherePlaceholder: { fontSize: 13, fontFamily: fonts.bodyBold, color: '#FFFFFF', marginTop: 2 },
  muted: { color: 'rgba(255,255,255,0.7)', fontFamily: fonts.body },
  pinDot: { width: 10, height: 10, marginLeft: 2, borderRadius: 0 },
  pinPickup: { backgroundColor: colors.accent },
  pinDrop: { backgroundColor: '#FFFFFF' },
  whereDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginVertical: 2, marginLeft: 38 },
  searchHint: {
    flexDirection: 'row', alignItems: 'center', gap: 6, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.25)',
    marginTop: 6, paddingTop: 8,
  },
  searchHintText: { fontSize: 12, color: 'rgba(255,255,255,0.9)', fontFamily: fonts.body },

  section: { fontSize: 13, fontFamily: fonts.bodyBold, color: colors.foreground, paddingHorizontal: 6, marginTop: 18, marginBottom: 8, letterSpacing: 0.2 },

  catGrid: { paddingHorizontal: 6, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  catItem: {
    borderWidth: 1, borderColor: colors.border, padding: 10, alignItems: 'flex-start',
    backgroundColor: colors.card, borderRadius: radius.md,
  },
  catIconChip: {
    width: 36, height: 36, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.chipBg,
    alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, marginBottom: 4,
  },
  catName: { fontSize: 13, fontFamily: fonts.heading, color: colors.foreground, marginTop: 2 },
  catHint: { fontSize: 10, color: colors.mutedForeground, fontFamily: fonts.body, marginTop: 1 },

  placeChip: {
    width: 220, flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: colors.border, padding: 8, backgroundColor: colors.card, borderRadius: radius.md,
  },
  placeIconChip: {
    width: 32, height: 32, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.chipBg,
    alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm,
  },
  placeLabel: { fontSize: 13, fontFamily: fonts.bodyBold, color: colors.foreground },
  placeAddr: { fontSize: 11, fontFamily: fonts.body, color: colors.mutedForeground, marginTop: 1 },

  recentHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingRight: 6 },
  viewAll: { fontSize: 12, fontFamily: fonts.bodyBold, color: colors.foreground, textDecorationLine: 'underline' },
  emptyRecent: { alignItems: 'center', paddingVertical: 24, gap: 6, paddingHorizontal: 24 },
  emptyIconWrap: {
    width: 60, height: 60, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.lg, marginBottom: 4,
  },
  emptyText: { fontSize: 12, color: colors.mutedForeground, fontFamily: fonts.body, textAlign: 'center' },
  recentRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 6,
    borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  recentIcon: {
    width: 36, height: 36, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.sm, backgroundColor: colors.card,
  },
  recentRoute: { fontSize: 13, fontFamily: fonts.bodyBold, color: colors.foreground },
  recentMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  recentMeta: { fontSize: 11, color: colors.mutedForeground, fontFamily: fonts.body },
  recentPrice: { fontSize: 14, fontFamily: fonts.displayBold, color: colors.foreground },
});
