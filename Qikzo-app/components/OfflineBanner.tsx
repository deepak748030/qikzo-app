import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, StatusBar } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WifiOff } from 'lucide-react-native';
import { colors, fonts } from '@/lib/theme';
import { subscribeNet } from '@/lib/netStatus';

/**
 * Global offline strip. Renders *inside* the top safe area so it never
 * sits in the status / notification bar. Only mounts when the phone
 * itself has no internet.
 */
export default function OfflineBanner() {
    const insets = useSafeAreaInsets();
    const [online, setOnline] = useState(true);
    useEffect(() => subscribeNet(setOnline), []);
    if (online) return null;
    const topInset = Math.max(
        insets.top,
        Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0,
    );
    return (
        <SafeAreaView edges={['top']} style={[styles.safe, { paddingTop: topInset }]}>
            <View style={styles.wrap}>
                <WifiOff size={14} color={colors.background} />
                <Text style={styles.txt}>No internet — some features may not work</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        backgroundColor: colors.background,
    },
    wrap: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: colors.danger,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    txt: { color: colors.background, fontFamily: fonts.bodyBold, fontSize: 12, flex: 1 },
});
