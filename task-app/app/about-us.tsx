import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import { Sparkles, FileText, ShieldCheck, Globe, ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';
import ScreenHeader from '@/components/ScreenHeader';
import { colors } from '@/lib/theme';

const LINKS = [
    { key: 'terms', label: 'Terms & Conditions', Icon: FileText, color: colors.primary, bg: '#DBEAFE', route: '/terms-conditions' as const },
    { key: 'privacy', label: 'Privacy Policy', Icon: ShieldCheck, color: colors.success, bg: '#DCFCE7', route: '/privacy-policy' as const },
    { key: 'web', label: 'Visit Website', Icon: Globe, color: colors.warning, bg: '#FEF3C7', url: 'https://example.com' },
];

export default function AboutUsScreen() {
    return (
        <View style={styles.container}>
            <ScreenHeader title="About Us" />
            <ScrollView contentContainerStyle={{ paddingHorizontal: 6, paddingBottom: 24 }}>
                <View style={styles.brandCard}>
                    <View style={styles.logo}><Sparkles size={28} color="#FFFFFF" /></View>
                    <Text style={styles.brand}>Self Task</Text>
                    <Text style={styles.version}>Version 1.0.0</Text>
                    <Text style={styles.tagline}>Earn rewards by completing simple tasks every day.</Text>
                </View>

                <View style={styles.menuCard}>
                    {LINKS.map((l, i) => (
                        <React.Fragment key={l.key}>
                            {i > 0 && <View style={styles.divider} />}
                            <Pressable
                                style={styles.row}
                                onPress={() => {
                                    if ((l as any).route) router.push((l as any).route);
                                    else if ((l as any).url) Linking.openURL((l as any).url);
                                }}
                            >
                                <View style={[styles.rowIcon, { backgroundColor: l.bg }]}>
                                    <l.Icon size={16} color={l.color} />
                                </View>
                                <Text style={styles.rowLabel}>{l.label}</Text>
                                <ChevronRight size={16} color={colors.mutedForeground} />
                            </Pressable>
                        </React.Fragment>
                    ))}
                </View>

                <Text style={styles.copy}>© 2026 Self Task. All rights reserved.</Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    brandCard: {
        backgroundColor: colors.card, alignItems: 'center', paddingVertical: 18,
        borderRadius: 6, borderWidth: 1, borderColor: colors.border, marginTop: 6,
    },
    logo: {
        width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary,
        alignItems: 'center', justifyContent: 'center',
    },
    brand: { color: colors.foreground, fontWeight: '800', fontSize: 18, marginTop: 8 },
    version: { color: colors.mutedForeground, fontSize: 11, marginTop: 2 },
    tagline: { color: colors.mutedForeground, fontSize: 12, textAlign: 'center', marginTop: 6, paddingHorizontal: 16 },
    menuCard: {
        backgroundColor: colors.card, borderRadius: 6, borderWidth: 1,
        borderColor: colors.border, marginTop: 6, overflow: 'hidden',
    },
    divider: { height: 1, backgroundColor: colors.border, marginLeft: 50 },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 10, gap: 10 },
    rowIcon: { width: 30, height: 30, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
    rowLabel: { flex: 1, color: colors.foreground, fontSize: 13, fontWeight: '600' },
    copy: { color: colors.mutedForeground, fontSize: 11, textAlign: 'center', marginTop: 16 },
});
