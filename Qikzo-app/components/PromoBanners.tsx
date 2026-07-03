import React from 'react';
import { View, Text, Image, Pressable, FlatList, StyleSheet, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { MapPin } from 'lucide-react-native';
import { colors, fonts } from '@/lib/theme';
import { promoBanners, PromoBanner } from '@/lib/mockData';
import { useBooking } from '@/lib/bookingStore';

// Horizontally scrollable, edge-to-edge banners. Each card is exactly the
// screen width so the first/last card sits flush against the screen edges —
// no side padding, no border radius.
export default function PromoBanners() {
    const { width } = useWindowDimensions();
    const setDraft = useBooking((s) => s.setDraft);

    const openBannerLocation = (b: PromoBanner) => {
        setDraft({
            drop: b.address,
            dropCoord: b.coord,
        });
        router.push({ pathname: '/select-location', params: { field: 'drop' } });
    };

    return (
        <FlatList
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            data={promoBanners}
            keyExtractor={(b) => b.id}
            style={{ marginTop: 14 }}
            renderItem={({ item }) => (
                <Pressable style={[styles.card, { width }]} onPress={() => openBannerLocation(item)}>
                    <Image source={item.image} style={styles.img} resizeMode="cover" />
                    <View style={styles.overlay} />
                    <View style={styles.body}>
                        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                        <View style={styles.metaRow}>
                            <MapPin size={11} color={'rgba(255,255,255,0.9)'} strokeWidth={2} />
                            <Text style={styles.sub} numberOfLines={1}>
                                {item.subtitle} · {item.coord.lat.toFixed(3)}, {item.coord.lng.toFixed(3)}
                            </Text>
                        </View>
                    </View>
                </Pressable>
            )}
        />
    );
}

const styles = StyleSheet.create({
    card: {
        height: 140,
        // no border radius, no margin — edge-to-edge
    },
    img: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
    overlay: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.35)',
    },
    body: { position: 'absolute', left: 12, right: 12, bottom: 12 },
    title: { fontSize: 18, fontFamily: fonts.displayBold, color: '#FFFFFF' },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    sub: { fontSize: 11, fontFamily: fonts.body, color: 'rgba(255,255,255,0.9)' },
});
