import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radius } from '@/lib/theme';

// Lightweight shimmer used across screens during first-render load.
// Keep the API tiny — width/height/style props are enough for every use case.
export default function Skeleton({ width, height = 14, style, rounded = 'sm' }: {
    width?: number | string;
    height?: number;
    style?: ViewStyle;
    rounded?: keyof typeof radius | number;
}) {
    const opacity = useRef(new Animated.Value(0.5)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [opacity]);

    const br = typeof rounded === 'number' ? rounded : radius[rounded];

    return (
        <Animated.View
            style={[
                styles.base,
                { width: width as any, height, borderRadius: br, opacity },
                style,
            ]}
        />
    );
}

// Pre-composed block that groups a few skeleton lines — used for list rows.
export function SkeletonRow() {
    return (
        <View style={styles.row}>
            <Skeleton width={40} height={40} rounded="md" />
            <View style={{ flex: 1, gap: 6 }}>
                <Skeleton width="60%" height={12} />
                <Skeleton width="40%" height={10} />
            </View>
            <Skeleton width={48} height={14} />
        </View>
    );
}

// Card-shaped placeholder for dashboard tiles.
export function SkeletonCard({ height = 96 }: { height?: number }) {
    return <Skeleton width="100%" height={height} rounded="md" style={{ marginBottom: 8 }} />;
}

const styles = StyleSheet.create({
    base: { backgroundColor: colors.chipBg, borderWidth: 1, borderColor: colors.border },
    row: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingVertical: 12, paddingHorizontal: 6,
        borderBottomWidth: 1, borderBottomColor: colors.divider,
    },
});
