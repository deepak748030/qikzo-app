import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Bike } from 'lucide-react-native';
import { colors, fonts, radius } from '@/lib/theme';
import ScreenHeader from '@/components/ScreenHeader';

export default function AboutUs() {
    const [refreshing, setRefreshing] = useState(false);
    const onRefresh = useCallback(() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 600); }, []);
    return (
        <View style={styles.container}>
            <ScreenHeader title="About us" />
            <ScrollView contentContainerStyle={{ padding: 6, paddingBottom: 24 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}>
                <View style={styles.brand}>
                    <View style={styles.mark}><Bike size={20} color={colors.primaryForeground} strokeWidth={2.4} /></View>
                    <View>
                        <Text style={styles.brandName}>Qikzo Partner</Text>
                        <Text style={styles.brandTag}>drive. deliver. earn.</Text>
                    </View>
                </View>
                <Text style={styles.p}>
                    Qikzo Partner is the rider app that powers Qikzo — India's on-demand point-to-point
                    delivery and ride network. Every job you take helps a customer get something across the city.
                </Text>
                <Text style={styles.h}>Our mission</Text>
                <Text style={styles.p}>
                    To create honest, flexible earning opportunities for lakhs of captains across India — with fair fares, transparent payouts, and respectful support.
                </Text>
                <Text style={styles.h}>Why ride with us</Text>
                <Text style={styles.p}>
                    • Flexible hours — go online when you want{'\n'}
                    • Transparent fares — you see the payout before accepting{'\n'}
                    • Daily payouts — no waiting weeks for your money{'\n'}
                    • 24×7 rider support
                </Text>
                <Text style={styles.muted}>Made with care in India 🇮🇳</Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    brand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 10, paddingHorizontal: 6 },
    mark: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    brandName: { fontSize: 18, fontFamily: fonts.displayBold, color: colors.foreground, letterSpacing: -0.3 },
    brandTag: { fontSize: 10, fontFamily: fonts.bodyBold, color: colors.mutedForeground, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 2 },
    p: { fontSize: 13, color: colors.mutedForeground, fontFamily: fonts.body, lineHeight: 21, marginTop: 6, paddingHorizontal: 6 },
    h: { fontSize: 16, fontFamily: fonts.displayBold, color: colors.foreground, marginTop: 16, paddingHorizontal: 6 },
    muted: { fontSize: 12, color: colors.mutedForeground, fontFamily: fonts.body, marginTop: 20, textAlign: 'center' },
});
