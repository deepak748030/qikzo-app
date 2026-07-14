import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { colors, fonts } from '@/lib/theme';
import { subscribeNet } from '@/lib/netStatus';

export default function OfflineBanner() {
    const [online, setOnline] = useState(true);
    useEffect(() => subscribeNet(setOnline), []);
    if (online) return null;
    return (
        <View style={styles.wrap}>
            <WifiOff size={14} color={colors.background} />
            <Text style={styles.txt}>No internet — reconnecting…</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: colors.danger,
        paddingHorizontal: 12,
        paddingVertical: 6,
        paddingTop: Platform.OS === 'ios' ? 6 : 8,
    },
    txt: { color: colors.background, fontFamily: fonts.bodyBold, fontSize: 12, flex: 1 },
});
