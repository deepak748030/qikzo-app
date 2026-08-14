import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, useWindowDimensions, FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  Search, Bell, ChevronRight, Clock, Zap, Plus,
  Home as HomeIcon, Building2, Heart, Bookmark, LucideIcon,
} from 'lucide-react-native';
import { colors, fonts, radius } from '@/lib/theme';
import Brand from '@/components/Brand';
import ServiceToggle from '@/components/ServiceToggle';
import AssetIcon from '@/components/AssetIcon';
import { categories as mockCategories, DeliveryCategory } from '@/lib/mockData';
import { useBooking } from '@/lib/bookingStore';
import { useServiceMode, rideOptions } from '@/lib/serviceMode';
import PromoBanners from '@/components/PromoBanners';
import ExploreBanners from '@/components/ExploreBanners';
import Skeleton, { SkeletonCard } from '@/components/Skeleton';
import { useInitialLoad } from '@/lib/useInitialLoad';
import { catalogApi } from '@/lib/api/endpoints/catalog';
import { tokenStore } from '@/lib/api/tokenStore';
import { useSavedPlaces } from '@/lib/savedPlacesStore';
import * as Location from 'expo-location';

const PLACE_ICON: Record<string, LucideIcon> = {
  home: HomeIcon,
  office: Building2,
  mom: Heart,
  "mom's place": Heart,
};

// Faux ETAs so the ride list feels alive without a live backend.
const RIDE_META: Record<string, { eta: string; tag?: string }> = {
  bike: { eta: '2 min away', tag: 'Fastest' },
  auto: { eta: '4 min away' },
  cab: { eta: '3 min away' },
};

// Statuses that mean a booking is still in motion — drives the live
// "active ride" banner on the home screen.
const ACTIVE_STATUSES = ['Searching rider', 'Rider accepted', 'Arriving for pickup', 'Picked up', 'On the way'];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const setDraft = useBooking((s) => s.setDraft);
  const draft = useBooking((s) => s.draft);
  const bookings = useBooking((s) => s.bookings);
  const hydrateFromServer = useBooking((s) => s.hydrateFromServer);
  const mode = useServiceMode((s) => s.mode);
  const setMode = useServiceMode((s) => s.setMode);
  const [selectedRide, setSelectedRide] = React.useState<string>(rideOptions[0].id);

  const loading = useInitialLoad();

  // Server-backed catalog. Saved places come from the user's address book —
  // never the mock Home/Office/Mom chips.
  const [categories, setCategories] = useState<DeliveryCategory[]>(mockCategories);
  const savedPlaces = useSavedPlaces((s) => s.places);

  // Best-effort device coord — used to filter promo/explore banners by
  // polygon proximity. Silent failure keeps the home screen usable when
  // permission is denied.
  const [userCoord, setUserCoord] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest });
        if (!cancelled) setUserCoord({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    catalogApi.listCategories()
      .then((items) => {
        if (cancelled || !items?.length) return;
        setCategories(items.map((c) => ({
          id: c.slug,
          name: c.name,
          emoji: c.emoji || '📦',
          hint: c.hint || '',
        })));
      })
      .catch(() => { /* keep mock */ });

    return () => { cancelled = true; };
  }, []);

  useFocusEffect(useCallback(() => {
    useSavedPlaces.getState().hydrate();
    // Refresh bookings whenever Home gains focus — this is what surfaces an
    // in-flight ride after the app is force-closed and reopened.
    hydrateFromServer();
  }, [hydrateFromServer]));

  // Most recent still-active booking (if any) → live banner at the top.
  const activeBooking = React.useMemo(() => {
    const list = bookings.filter((b) => ACTIVE_STATUSES.includes(b.status));
    if (!list.length) return null;
    return [...list].sort((a, b) => b.createdAt - a.createdAt)[0];
  }, [bookings]);

  const openWithCategory = (categoryId: string, drop?: string, dropCoord?: { lat: number; lng: number } | null) => {
    const patch: Parameters<typeof setDraft>[0] = { mode, categoryId };
    if (drop) {
      patch.drop = drop;
      patch.dropCoord = dropCoord ?? null;
    }
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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 92 }}>

        {loading ? (
          <View style={{ padding: 6, gap: 8, marginTop: 12 }}>
            <SkeletonCard height={68} />
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
              <Skeleton width={80} height={30} rounded="pill" />
              <Skeleton width={90} height={30} rounded="pill" />
              <Skeleton width={110} height={30} rounded="pill" />
            </View>
            <Skeleton width={130} height={12} style={{ marginTop: 14, marginBottom: 4 }} />
            <SkeletonCard height={72} />
            <SkeletonCard height={72} />
            <SkeletonCard height={72} />
            <SkeletonCard height={140} />
          </View>
        ) : (
        <>
        {/* Live active-ride banner — tap to jump back into the trip. */}
        {activeBooking ? (
          <Pressable
            style={styles.activeCard}
            onPress={() => router.push({ pathname: '/booking-details', params: { id: activeBooking.id } })}
          >
            <View style={styles.activeIconWrap}>
              <Zap size={16} color={colors.primaryForeground} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.activeTitle} numberOfLines={1}>
                {activeBooking.status} · #{activeBooking.id}
              </Text>
              <Text style={styles.activeSub} numberOfLines={1}>
                {activeBooking.drop ? `To ${activeBooking.drop}` : 'Tap to view your ride'}
              </Text>
            </View>
            <ChevronRight size={18} color={colors.primaryForeground} />
          </Pressable>
        ) : null}

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

        {/* Saved places — real addresses from the user's profile */}
        <FlatList
          horizontal
          data={savedPlaces}
          keyExtractor={(p) => p.id}
          showsHorizontalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ width: 6 }} />}
          contentContainerStyle={styles.placesRow}
          ListEmptyComponent={tokenStore.get().accessToken ? (
            <Pressable style={styles.placeChip} onPress={() => router.push('/addresses')}>
              <Plus size={13} color={colors.foreground} strokeWidth={1.8} />
              <Text style={styles.placeLabel}>Add address</Text>
            </Pressable>
          ) : null}
          renderItem={({ item }) => {
            const PIcon = PLACE_ICON[item.label.toLowerCase()] || Bookmark;
            return (
              <Pressable
                style={styles.placeChip}
                onPress={() => openWithCategory(mode === 'ride' ? selectedRide : 'parcel', item.address, item.coord)}
              >
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
              {rideOptions.map((r, idx) => {
                const meta = RIDE_META[r.id];
                const isSelected = selectedRide === r.id;
                const isFirst = idx === 0;
                const isLast = idx === rideOptions.length - 1;
                // If the NEXT card is selected, drop this card's bottom border so
                // the selected card's thick Cyprus border shows cleanly — no
                // sand line sneaking between them.
                const nextSelected =
                  idx < rideOptions.length - 1 && selectedRide === rideOptions[idx + 1].id;
                return (
                  <Pressable
                    key={r.id}
                    onPress={() => setSelectedRide(r.id)}
                    onLongPress={() => openWithCategory(r.id)}
                    style={[
                      isSelected ? styles.rideCardSelected : styles.rideCard,
                      // stitch cards together — no visible gap, share borders
                      !isFirst && !isSelected && { borderTopWidth: 0 },
                      !isSelected && nextSelected && { borderBottomWidth: 0 },
                      isFirst && { borderTopLeftRadius: radius.md, borderTopRightRadius: radius.md },
                      isLast && { borderBottomLeftRadius: radius.md, borderBottomRightRadius: radius.md },
                      !isFirst && !isLast && { borderRadius: 0 },
                      isFirst && !isLast && { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
                      isLast && !isFirst && { borderTopLeftRadius: 0, borderTopRightRadius: 0 },
                    ]}
                  >
                    <View style={styles.rideArt}>
                      <AssetIcon id={r.id} size={r.id === 'cab' ? (isSelected ? 78 : 66) : (isSelected ? 60 : 44)} />
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

            <PromoBanners userCoord={userCoord} />
            <ExploreBanners userCoord={userCoord} />
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

            <PromoBanners userCoord={userCoord} />
            <ExploreBanners userCoord={userCoord} />
          </>
        )}
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

  activeCard: {
    marginHorizontal: 6, marginTop: 12,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.primary, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.accent,
    paddingHorizontal: 12, paddingVertical: 12,
  },
  activeIconWrap: {
    width: 30, height: 30, borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center',
  },
  activeTitle: { fontSize: 13, fontFamily: fonts.bodyBold, color: colors.primaryForeground },
  activeSub: { fontSize: 11, fontFamily: fonts.body, color: 'rgba(255,255,255,0.85)', marginTop: 1 },
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

  // Rides list — cards stitched together (no vertical gap between bike/auto/cab).
  rideList: { paddingHorizontal: 6 },
  rideCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card,
    paddingVertical: 10, paddingHorizontal: 10,
  },
  rideCardSelected: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.card,
    borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 10,
    marginVertical: -1, zIndex: 2,
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
  tileArt: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  tileBody: { flex: 1 },
  tileName: { fontSize: 13, fontFamily: fonts.displayBold, color: colors.foreground },
  tileHint: { fontSize: 10, color: colors.mutedForeground, fontFamily: fonts.body, marginTop: 1 },
});
