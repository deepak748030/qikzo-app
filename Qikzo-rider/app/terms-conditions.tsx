import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { colors, fonts } from '@/lib/theme';
import ScreenHeader from '@/components/ScreenHeader';

export default function TermsConditions() {
    const [refreshing, setRefreshing] = useState(false);
    const onRefresh = useCallback(() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 600); }, []);
    return (
        <View style={styles.container}>
            <ScreenHeader title="Terms & conditions" />
            <ScrollView contentContainerStyle={{ padding: 6, paddingBottom: 24 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}>
                <Text style={styles.p}>Last updated: July 2026</Text>
                <Text style={styles.h}>Rider eligibility</Text>
                <Text style={styles.p}>You must be 18+, hold a valid driving licence and RC for the vehicle you use, and have current insurance.</Text>
                <Text style={styles.h}>Fares & payouts</Text>
                <Text style={styles.p}>Fares are calculated as base + per-km. Cash and UPI collected during trips are settled to your bank account daily.</Text>
                <Text style={styles.h}>Conduct</Text>
                <Text style={styles.p}>You agree to treat customers respectfully, transport only permitted items, and follow local traffic laws at all times.</Text>
                <Text style={styles.h}>Liability</Text>
                <Text style={styles.p}>Qikzo is not liable for delays or losses caused by weather, traffic, vehicle breakdowns, or events beyond reasonable control.</Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    p: { fontSize: 13, color: colors.mutedForeground, fontFamily: fonts.body, lineHeight: 21, marginTop: 6, paddingHorizontal: 6 },
    h: { fontSize: 16, fontFamily: fonts.displayBold, color: colors.foreground, marginTop: 16, paddingHorizontal: 6 },
});
