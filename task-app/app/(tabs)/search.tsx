import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search as SearchIcon, X } from 'lucide-react-native';
import { Pressable } from 'react-native';
import { colors, fonts } from '@/lib/theme';
import ProductRow from '@/components/ProductRow';
import { products, Product } from '@/lib/mockData';

const PAGE = 10;

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [searching, setSearching] = useState(false);
  const [page, setPage] = useState(1);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Debounced search (400ms) — no API call per keystroke.
  useEffect(() => {
    setSearching(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setDebounced(query.trim().toLowerCase());
      setPage(1);
      setSearching(false);
    }, 400);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query]);

  const results = useMemo(() => {
    if (!debounced) return products;
    return products.filter((p) => p.name.toLowerCase().includes(debounced) || p.unit.toLowerCase().includes(debounced));
  }, [debounced]);

  const data = useMemo(() => results.slice(0, page * PAGE), [results, page]);
  const hasMore = data.length < results.length;

  const renderEmpty = () => {
    if (searching) return null;
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyEmoji}>🔍</Text>
        <Text style={styles.emptyTitle}>No products found</Text>
        <Text style={styles.emptySub}>Try a different name or category.</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.searchBar}>
        <SearchIcon size={18} color={colors.mutedForeground} />
        <TextInput
          autoFocus
          placeholder="Search products..."
          placeholderTextColor={colors.mutedForeground}
          style={styles.input}
          value={query}
          onChangeText={setQuery}
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <X size={16} color={colors.mutedForeground} />
          </Pressable>
        ) : null}
      </View>

      {searching ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={colors.foreground} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item: Product) => item.id}
          renderItem={({ item }) => <ProductRow product={item} />}
          ItemSeparatorComponent={() => <View style={{ height: 0 }} />}
          onEndReached={() => hasMore && setPage((p) => p + 1)}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20, flexGrow: 1 }}
          ListFooterComponent={hasMore ? <ActivityIndicator style={{ marginVertical: 14 }} color={colors.foreground} /> : null}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchBar: {
    marginHorizontal: 6, marginBottom: 6, height: 42, flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 10, borderWidth: 1, borderColor: colors.inputBorder, backgroundColor: colors.inputBg, borderRadius: 0,
  },
  input: { flex: 1, fontSize: 14, color: colors.foreground, fontFamily: fonts.body, paddingVertical: 8 },
  empty: { alignItems: 'center', justifyContent: 'center', flex: 1, paddingTop: 60 },
  emptyEmoji: { fontSize: 44 },
  emptyTitle: { fontSize: 16, fontFamily: fonts.displayBold, color: colors.foreground, marginTop: 10 },
  emptySub: { fontSize: 13, color: colors.mutedForeground, fontFamily: fonts.body, marginTop: 4 },
});
