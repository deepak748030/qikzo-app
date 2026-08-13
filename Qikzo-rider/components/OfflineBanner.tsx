import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WifiOff } from 'lucide-react-native';
import { colors, fonts } from '@/lib/theme';
import { subscribeNet } from '@/lib/netStatus';

export default function OfflineBanner() {
    const [online, setOnline] = useState(true);
    useEffect(() => subscribeNet(setOnline), []);
    if (online) return null;
    return (
        <SafeAreaView edges={['top']} style={styles.safe}>
            <View style={styles.wrap}>
                <WifiOff size={14} color={colors.background} />
                <Text style={styles.txt}>No internet — reconnecting…</Text>
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
