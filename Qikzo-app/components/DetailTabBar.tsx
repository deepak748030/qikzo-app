import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, fonts, radius } from '@/lib/theme';

export type DetailTab = 'details' | 'rating';

type Props = {
    value: DetailTab;
    onChange: (t: DetailTab) => void;
};

/**
 * Two-segment tab bar for the banner detail screen (Details | Rating).
 * Mirrors the ServiceToggle pill treatment so it reads as the same design
 * language as the rest of the app.
 */
export default function DetailTabBar({ value, onChange }: Props) {
    return (
        <View style={styles.track}>
            <Segment label="Details" active={value === 'details'} onPress={() => onChange('details')} />
            <Segment label="Rating" active={value === 'rating'} onPress={() => onChange('rating')} />
        </View>
    );
}

function Segment({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
    return (
        <Pressable
            onPress={onPress}
            style={[styles.seg, active && styles.segActive]}
            hitSlop={4}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
        >
            <Text style={[styles.segText, active && styles.segTextActive]}>{label}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    track: {
        flexDirection: 'row',
        backgroundColor: colors.chipBg,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.pill,
        padding: 3,
        gap: 3,
    },
    seg: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 9,
        borderRadius: radius.pill,
    },
    segActive: { backgroundColor: colors.primary },
    segText: { fontSize: 13, fontFamily: fonts.bodyBold, color: colors.primary, letterSpacing: 0.2 },
    segTextActive: { color: colors.primaryForeground },
});
