import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Activity, User, LucideIcon } from 'lucide-react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors, fonts } from '@/lib/theme';

// Icon + label per route — kept local so this component owns its visual identity.
const ICONS: Record<string, LucideIcon> = {
    index: Home,
    activity: Activity,
    profile: User,
};
const LABELS: Record<string, string> = {
    index: 'Home',
    activity: 'Activity',
    profile: 'Profile',
};

// Dimensions tuned to the reference: chunky floating circle that lifts above
// a flat white bar which is flush to the bottom edge of the screen.
const BUBBLE = 56;
const BUBBLE_LIFT = 26;   // how far the circle rises above the bar
const BAR_HEIGHT = 64;

export default function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
    const insets = useSafeAreaInsets();
    const [barWidth, setBarWidth] = useState(0);
    const tabCount = state.routes.length;
    const tabWidth = tabCount > 0 ? barWidth / tabCount : 0;

    // Native-driven horizontal slide for the floating circle.
    const translateX = useRef(new Animated.Value(0)).current;
    // Small "lift + settle" bounce on switch, driven off the same animation frame.
    const bounce = useRef(new Animated.Value(1)).current;

    const targetX = useMemo(() => {
        if (tabWidth <= 0) return 0;
        return state.index * tabWidth + tabWidth / 2 - BUBBLE / 2;
    }, [state.index, tabWidth]);

    useEffect(() => {
        Animated.parallel([
            Animated.spring(translateX, {
                toValue: targetX,
                useNativeDriver: true,
                bounciness: 8,
                speed: 14,
            }),
            Animated.sequence([
                Animated.timing(bounce, { toValue: 0.82, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: true }),
                Animated.spring(bounce, { toValue: 1, useNativeDriver: true, bounciness: 12, speed: 16 }),
            ]),
        ]).start();
    }, [targetX, translateX, bounce]);

    const onLayout = (e: LayoutChangeEvent) => setBarWidth(e.nativeEvent.layout.width);

    return (
        // Flush to the bottom + left/right edges of the screen — no side gap, no bottom gap.
        <View pointerEvents="box-none" style={styles.wrap}>
            <View
                style={[styles.bar, { height: BAR_HEIGHT + insets.bottom, paddingBottom: insets.bottom }]}
                onLayout={onLayout}
            >
                {/* Floating circular indicator — rides above the bar and slides to the active tab. */}
                {barWidth > 0 ? (
                    <Animated.View
                        pointerEvents="none"
                        style={[
                            styles.bubble,
                            {
                                width: BUBBLE,
                                height: BUBBLE,
                                top: -BUBBLE_LIFT,
                                transform: [{ translateX }, { scale: bounce }],
                            },
                        ]}
                    >
                        <View style={styles.bubbleRing}>
                            {(() => {
                                const activeRoute = state.routes[state.index];
                                const Icon = ICONS[activeRoute.name] ?? Home;
                                return <Icon size={22} color={colors.primary} strokeWidth={2.4} />;
                            })()}
                        </View>
                    </Animated.View>
                ) : null}

                {/* Static tab slots */}
                {state.routes.map((route, index) => {
                    const focused = state.index === index;
                    const Icon = ICONS[route.name] ?? Home;
                    const label = LABELS[route.name] ?? route.name;

                    const onPress = () => {
                        const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                        if (!focused && !event.defaultPrevented) {
                            navigation.navigate(route.name as never);
                        }
                    };
                    const onLongPress = () => {
                        navigation.emit({ type: 'tabLongPress', target: route.key });
                    };

                    return (
                        <Pressable
                            key={route.key}
                            onPress={onPress}
                            onLongPress={onLongPress}
                            style={styles.slot}
                            hitSlop={6}
                            accessibilityRole="button"
                            accessibilityState={focused ? { selected: true } : {}}
                            accessibilityLabel={label}
                        >
                            {/* Hide in-bar icon on the active slot — the floating bubble shows it above. */}
                            <View style={[styles.iconSpot, focused && styles.iconSpotHidden]}>
                                <Icon size={20} color={colors.primary} strokeWidth={2} />
                            </View>
                            <Text style={[styles.label, focused && styles.labelActive]} numberOfLines={1}>
                                {label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    // Flush to the bottom of the phone — no floating gap on any side.
    wrap: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
    },
    // Flat white bar (no shadow, no bottom rounding). A thin top border keeps
    // it visible on any background.
    bar: {
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    slot: {
        flex: 1,
        height: BAR_HEIGHT,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
    },
    iconSpot: {
        alignItems: 'center', justifyContent: 'center',
        height: 22,
        opacity: 1,
    },
    iconSpotHidden: { opacity: 0 },
    label: {
        fontSize: 10,
        fontFamily: fonts.bodyBold,
        color: colors.mutedForeground,
        letterSpacing: 0.3,
    },
    labelActive: {
        color: colors.primary,
        marginTop: 20, // pushes the label down under the notched bubble
    },
    bubble: {
        position: 'absolute',
        left: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Outlined white circle — matches the reference exactly. No shadow.
    bubbleRing: {
        width: '100%', height: '100%',
        borderRadius: 999,
        backgroundColor: '#FFFFFF',
        borderWidth: 4.5,
        borderColor: colors.primaryForeground,
        alignItems: 'center', justifyContent: 'center',
    },
});
