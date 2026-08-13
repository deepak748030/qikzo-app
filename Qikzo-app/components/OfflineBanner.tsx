import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WifiOff } from 'lucide-react-native';
import { colors, fonts } from '@/lib/theme';
import { subscribeNet } from '@/lib/netStatus';

/**
 * Global offline strip. Sits inside the top safe area (below the status /
 * notification bar) and only appears when the *device* has no internet —
 * never because the free-tier server is still waking up.
 */
export default function OfflineBanner() {
    const [online, setOnline] = useState(true);
    useEffect(() => subscribeNet(setOnline), []);
    if (online) return null;
    return (
        <SafeAreaView edges={['top']} style={styles.safe}>
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
