import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, Pressable, useWindowDimensions, ActivityIndicator, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Search, MapPin, Grid3x3, Apple, Carrot, Milk, Croissant, Cookie, CupSoda, Wheat, Bell, ChevronRight } from 'lucide-react-native';
import * as Location from 'expo-location';
import { colors, fonts } from '@/lib/theme';
import Brand from '@/components/Brand';
import ProductCard from '@/components/ProductCard';
import { categories, products, Product } from '@/lib/mockData';
import { useAuth } from '@/lib/authStore';

const BANNERS = [
  { id: 'b1', title: 'Fresh fruits', sub: 'Up to 30% off', image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=800&q=80&auto=format&fit=crop' },
  { id: 'b2', title: 'Daily dairy', sub: 'Farm fresh everyday', image: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=800&q=80&auto=format&fit=crop' },
  { id: 'b3', title: 'Pantry staples', sub: 'Stock up & save', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800&q=80&auto=format&fit=crop' },
];

const CAT_ICONS = {
  all: Grid3x3, fruits: Apple, vegetables: Carrot, dairy: Milk,
  bakery: Croissant, snacks: Cookie, beverages: CupSoda, staples: Wheat,
} as const;

const PAGE = 8;


export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const location = useAuth((s) => s.location);
  const setLocation = useAuth((s) => s.setLocation);
  const cardWidth = (width - 12 - 6) / 2;

  const [activeCat, setActiveCat] = useState('all');
  const [page, setPage] = useState(1);
  const [locLoading, setLocLoading] = useState(false);

  const detectLocation = useCallback(async () => {
    try {
      setLocLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocation('Location off — tap to enable');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const places = await Location.reverseGeocodeAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      const p = places?.[0];
      if (p) {
        const parts = [p.name || p.street, p.city || p.subregion, p.region].filter(Boolean);
        setLocation(parts.slice(0, 2).join(', ') || 'Current location');
      } else {
        setLocation('Current location');
      }
    } catch {
      setLocation('Unable to fetch location');
    } finally {
      setLocLoading(false);
    }
  }, [setLocation]);

  useEffect(() => {
    if (!location) detectLocation();
  }, [location, detectLocation]);

  const filtered = useMemo(
    () => (activeCat === 'all' ? products : products.filter((p) => p.categoryId === activeCat)),
    [activeCat]
  );
  const data = useMemo(() => filtered.slice(0, page * PAGE), [filtered, page]);
  const hasMore = data.length < filtered.length;

  const loadMore = useCallback(() => {
    if (hasMore) setPage((p) => p + 1);
  }, [hasMore]);

  const onCat = (id: string) => { setActiveCat(id); setPage(1); };

  const Header = (
    <View>
      <View style={[styles.banners]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={width} decelerationRate="fast">
          {BANNERS.map((b) => (
            <View key={b.id} style={[styles.banner, { width }]}>
              <View style={styles.bannerInner}>
                <Image source={{ uri: b.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                <View style={styles.bannerOverlay} />
                <View style={styles.bannerText}>
                  <Text style={styles.bannerTitle}>{b.title}</Text>
                  <Text style={styles.bannerSub}>{b.sub}</Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
        {categories.map((c) => {
          const active = c.id === activeCat;
          const Icon = CAT_ICONS[c.icon] ?? Grid3x3;
          return (
            <Pressable key={c.id} style={[styles.cat, active && styles.catActive]} onPress={() => onCat(c.id)}>
              <View style={styles.catIconWrap}>
                <Icon size={22} color={active ? colors.accent : colors.foreground} strokeWidth={1.8} />
              </View>
              <Text numberOfLines={1} style={[styles.catLabel, active && styles.catLabelActive]}>{c.name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>


      <Text style={styles.section}>Popular near you</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + 6 }]}>
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Brand size={22} />
          <Pressable style={styles.locRow} onPress={detectLocation} hitSlop={6}>
            <MapPin size={12} color={colors.foreground} />
            {locLoading ? (
              <ActivityIndicator size="small" color={colors.foreground} />
            ) : (
              <Text numberOfLines={1} style={styles.loc}>{location || 'Detecting location...'}</Text>
            )}
            <ChevronRight size={12} color={colors.mutedForeground} />
          </Pressable>
        </View>
        <Pressable style={styles.bellBtn} onPress={() => router.push('/notifications')} hitSlop={8}>
          <Bell size={20} color={colors.foreground} strokeWidth={1.8} />
          <View style={styles.bellDot} />
        </Pressable>
      </View>

      <Pressable style={styles.searchBar} onPress={() => router.push('/search')}>
        <Search size={18} color={colors.mutedForeground} />
        <Text style={styles.searchText}>Search for fruits, milk, bread...</Text>
      </Pressable>

      <FlatList
        data={data}
        keyExtractor={(item: Product) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.col}
        ListHeaderComponent={Header}
        ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
        renderItem={({ item }) => <ProductCard product={item} width={cardWidth} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListFooterComponent={hasMore ? <ActivityIndicator style={{ marginVertical: 14 }} color={colors.foreground} /> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: { paddingHorizontal: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  loc: { fontSize: 11, color: colors.foreground, fontFamily: fonts.bodyBold, maxWidth: 200 },
  bellBtn: { width: 38, height: 38, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', borderRadius: 0 },
  bellDot: { position: 'absolute', top: 8, right: 9, width: 6, height: 6, backgroundColor: colors.accent },
  searchBar: {
    marginHorizontal: 6, marginTop: 10, marginBottom: 6, height: 40, flexDirection: 'row', alignItems: 'center',
    gap: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.inputBorder, backgroundColor: colors.inputBg, borderRadius: 0,
  },
  searchText: { color: colors.mutedForeground, fontSize: 13, fontFamily: fonts.body },
  banners: { marginBottom: 6 },
  banner: { paddingHorizontal: 0 },
  bannerInner: {
    height: 130, marginHorizontal: 0, overflow: 'hidden', borderRadius: 0,
    justifyContent: 'flex-end',
  },
  bannerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  bannerText: { padding: 16 },
  bannerTitle: { color: '#fff', fontSize: 22, fontFamily: fonts.displayBold },
  bannerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontFamily: fonts.body, marginTop: 4 },
  catRow: { paddingHorizontal: 6, gap: 6, paddingVertical: 4 },
  cat: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 0, backgroundColor: colors.card, minWidth: 84 },
  catActive: { borderColor: colors.foreground, borderWidth: 2 },
  catIconWrap: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  catLabel: { fontSize: 11, fontFamily: fonts.bodyBold, color: colors.foreground, marginTop: 4 },
  catLabelActive: { color: colors.foreground },
  section: { fontSize: 16, fontFamily: fonts.displayBold, color: colors.foreground, paddingHorizontal: 6, marginTop: 12, marginBottom: 8 },
  col: { paddingHorizontal: 6, gap: 6 },
});
