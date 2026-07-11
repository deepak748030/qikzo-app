import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { colors, fonts, radius } from '@/lib/theme';
import ScreenHeader from '@/components/ScreenHeader';

const FAQS = [
    { q: 'How do payouts work?', a: 'Cash and UPI collected during trips are settled to your registered bank account daily by 10 AM.' },
    { q: 'How is my fare calculated?', a: 'Fare = ₹25 base + ₹8 per km of distance from pickup to drop. You keep the full fare shown on the job card.' },
    { q: 'What if a customer is unreachable?', a: 'Call the customer from the active job screen. If still unreachable after 5 minutes, cancel with the reason "customer not reachable" — no penalty.' },
    { q: 'Can I cancel a job after accepting?', a: 'Yes, from the active job screen using "Cancel job". Frequent cancellations can affect your rating.' },
    { q: 'When can I go online?', a: 'Anytime — Qikzo has no shifts. Toggle "Go online" from home to start receiving jobs.' },
    { q: 'What documents do I need?', a: 'Driving licence, vehicle RC, insurance and a clear profile photo. Manage them from Profile → Documents.' },
];

export default function HelpSupport() {
    const [refreshing, setRefreshing] = useState(false);
    const onRefresh = useCallback(() => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 600);
    }, []);
    return (
        <View style={styles.container}>
            <ScreenHeader title="Help & support" />
            <ScrollView contentContainerStyle={{ padding: 6, paddingBottom: 24 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}>
                <Text style={styles.lead}>Rider support is available 24×7. Reach us at partner@quikzo.in or call +91 1800 456 789.</Text>
                <Text style={styles.section}>Frequently asked</Text>
                {FAQS.map((f) => (
                    <View key={f.q} style={styles.card}>
                        <Text style={styles.q}>{f.q}</Text>
                        <Text style={styles.a}>{f.a}</Text>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    lead: { fontSize: 13, color: colors.mutedForeground, fontFamily: fonts.body, lineHeight: 20 },
    section: { fontSize: 16, fontFamily: fonts.displayBold, color: colors.foreground, marginTop: 16, marginBottom: 8 },
    card: { borderWidth: 1, borderColor: colors.border, padding: 10, marginBottom: 6, borderRadius: radius.sm, backgroundColor: colors.card },
    q: { fontSize: 14, fontFamily: fonts.heading, color: colors.foreground },
    a: { fontSize: 13, color: colors.mutedForeground, fontFamily: fonts.body, marginTop: 4, lineHeight: 19 },
});
