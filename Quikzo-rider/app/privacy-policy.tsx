import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, fonts } from '@/lib/theme';
import ScreenHeader from '@/components/ScreenHeader';

export default function PrivacyPolicy() {
    return (
        <View style={styles.container}>
            <ScreenHeader title="Privacy policy" />
            <ScrollView contentContainerStyle={{ padding: 6, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
                <Text style={styles.p}>Last updated: July 2026</Text>
                <Text style={styles.h}>Information we collect</Text>
                <Text style={styles.p}>We collect your mobile number, KYC documents, vehicle details, live location while online, and earnings history to operate Qikzo Partner.</Text>
                <Text style={styles.h}>How we use it</Text>
                <Text style={styles.p}>Data is used to match you to nearby jobs, calculate fares, process daily payouts, verify your identity, and improve rider safety. We never sell your personal data.</Text>
                <Text style={styles.h}>Location</Text>
                <Text style={styles.p}>Live location is only tracked while you are online or on an active trip. You can go offline anytime to stop sharing location.</Text>
                <Text style={styles.h}>Contact</Text>
                <Text style={styles.p}>For privacy questions, email privacy@quikzo.in.</Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    p: { fontSize: 13, color: colors.mutedForeground, fontFamily: fonts.body, lineHeight: 21, marginTop: 6, paddingHorizontal: 6 },
    h: { fontSize: 16, fontFamily: fonts.displayBold, color: colors.foreground, marginTop: 16, paddingHorizontal: 6 },
});
