import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, StyleSheet } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { colors } from '@/lib/theme';

type Props = {
    Icon: LucideIcon;
    size?: number;
    color?: string;
    strokeWidth?: number;
    /** 'pulse' = scale loop, 'ping' = scale+ring, 'spin' = rotate loop, 'bounce' = vertical bob */
    variant?: 'pulse' | 'ping' | 'spin' | 'bounce';
    /** Ring color for the 'ping' variant. Defaults to theme accent. */
    ringColor?: string;
};

// Lightweight reusable animated wrapper for any lucide icon.
// Uses the JS-side Animated API (works on every Expo target without extra deps).
export default function AnimatedIcon({
    Icon,
    size = 18,
    color = colors.foreground,
    strokeWidth = 2,
    variant = 'pulse',
    ringColor = colors.accent,
}: Props) {
    const value = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const duration = variant === 'spin' ? 2400 : variant === 'bounce' ? 900 : 1400;
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(value, { toValue: 1, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
                Animated.timing(value, { toValue: 0, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [value, variant]);

    if (variant === 'spin') {
        const rotate = value.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
        return (
            <Animated.View style={{ transform: [{ rotate }] }}>
                <Icon size={size} color={color} strokeWidth={strokeWidth} />
            </Animated.View>
        );
    }

    if (variant === 'bounce') {
        const translateY = value.interpolate({ inputRange: [0, 1], outputRange: [0, -3] });
        return (
            <Animated.View style={{ transform: [{ translateY }] }}>
                <Icon size={size} color={color} strokeWidth={strokeWidth} />
            </Animated.View>
        );
    }

    if (variant === 'ping') {
        const ringScale = value.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] });
        const ringOpacity = value.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] });
        return (
            <View style={[styles.ringWrap, { width: size + 8, height: size + 8 }]}>
                <Animated.View
                    style={[
                        styles.ring,
                        {
                            width: size + 8, height: size + 8,
                            borderColor: ringColor, opacity: ringOpacity, transform: [{ scale: ringScale }],
                        },
                    ]}
                />
                <Icon size={size} color={color} strokeWidth={strokeWidth} />
            </View>
        );
    }

    // pulse
    const scale = value.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
    return (
        <Animated.View style={{ transform: [{ scale }] }}>
            <Icon size={size} color={color} strokeWidth={strokeWidth} />
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    ringWrap: { alignItems: 'center', justifyContent: 'center' },
    ring: { position: 'absolute', borderWidth: 1, borderRadius: 999 },
});
