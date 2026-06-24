import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, Pressable, useWindowDimensions, ActivityIndicator, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Search, MapPin } from 'lucide-react-native';
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


const PAGE = 8;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const phone = useAuth((s) => s.phone);
  const cardWidth = (width - 12 - 6) / 2;

  const [activeCat, setActiveCat] = useState('all');
  const [page, setPage] = useState(1);

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
          return (
            <Pressable key={c.id} style={[styles.cat, active && styles.catActive]} onPress={() => onCat(c.id)}>
              <Image source={{ uri: c.image }} style={styles.catImg} resizeMode="cover" />
              <Text style={[styles.catLabel, active && styles.catLabelActive]}>{c.name}</Text>
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
        <View>
          <Brand size={26} />
          <View style={styles.locRow}>
            <MapPin size={12} color={colors.mutedForeground} />
            <Text style={styles.loc}>{phone ? `Delivering to ${phone}` : 'Set delivery location'}</Text>
          </View>
        </View>
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
  topBar: { paddingHorizontal: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  loc: { fontSize: 11, color: colors.mutedForeground, fontFamily: fonts.body },
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
  catRow: { paddingHorizontal: 6, gap: 8, paddingVertical: 4 },
  cat: { alignItems: 'center', paddingBottom: 6, paddingHorizontal: 6, paddingTop: 6, borderWidth: 1, borderColor: colors.border, borderRadius: 0, backgroundColor: colors.card, width: 72 },
  catActive: { borderColor: colors.foreground, borderWidth: 2 },
  catImg: { width: 44, height: 44, borderRadius: 0 },
  catLabel: { fontSize: 11, fontFamily: fonts.bodyBold, color: colors.foreground, marginTop: 4 },
  catLabelActive: { color: colors.foreground },
  section: { fontSize: 16, fontFamily: fonts.displayBold, color: colors.foreground, paddingHorizontal: 6, marginTop: 12, marginBottom: 8 },
  col: { paddingHorizontal: 6, gap: 6 },
});
