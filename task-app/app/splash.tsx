import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { router } from 'expo-router';
import { colors, fonts } from '@/lib/theme';
import { useAuth } from '@/lib/authStore';

export default function SplashAnimated() {
    const onboarded = useAuth((s) => s.onboarded);
    const phone = useAuth((s) => s.phone);

    const markScale = useRef(new Animated.Value(0.4)).current;
    const markOpacity = useRef(new Animated.Value(0)).current;
    const dotScale = useRef(new Animated.Value(0)).current;
    const wordOpacity = useRef(new Animated.Value(0)).current;
    const wordTranslate = useRef(new Animated.Value(12)).current;
    const taglineOpacity = useRef(new Animated.Value(0)).current;
    const ringScale = useRef(new Animated.Value(0.6)).current;
    const ringOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.sequence([
            Animated.parallel([
                Animated.timing(markScale, { toValue: 1, duration: 520, easing: Easing.out(Easing.back(1.6)), useNativeDriver: true }),
                Animated.timing(markOpacity, { toValue: 1, duration: 360, useNativeDriver: true }),
            ]),
            Animated.parallel([
                Animated.spring(dotScale, { toValue: 1, friction: 4, tension: 140, useNativeDriver: true }),
                Animated.timing(wordOpacity, { toValue: 1, duration: 320, useNativeDriver: true }),
                Animated.timing(wordTranslate, { toValue: 0, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            ]),
            Animated.parallel([
                Animated.timing(taglineOpacity, { toValue: 1, duration: 320, useNativeDriver: true }),
                Animated.timing(ringScale, { toValue: 1.6, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
                Animated.timing(ringOpacity, { toValue: 0, duration: 900, useNativeDriver: true }),
            ]),
        ]).start();

        const t = setTimeout(() => {
            if (!onboarded) router.replace('/onboarding');
            else if (!phone) router.replace('/login');
            else router.replace('/(tabs)');
        }, 2000);
        return () => clearTimeout(t);
    }, []);

    return (
        <View style={styles.container}>
            <View style={styles.center}>
                <View style={styles.markWrap}>
                    <Animated.View
                        style={[
                            styles.ring,
                            { opacity: ringOpacity, transform: [{ scale: ringScale }] },
                        ]}
                    />
                    <Animated.View style={[styles.mark, { opacity: markOpacity, transform: [{ scale: markScale }] }]}>
                        <Text style={styles.markText}>Q</Text>
                        <Animated.View style={[styles.dot, { transform: [{ scale: dotScale }] }]} />
                    </Animated.View>
                </View>
                <Animated.Text style={[styles.word, { opacity: wordOpacity, transform: [{ translateY: wordTranslate }] }]}>
                    Qikzo
                </Animated.Text>
                {/* Updated tagline for on-demand delivery positioning */}
                <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
                    anything. anywhere. now.
                </Animated.Text>
            </View>
            <Animated.Text style={[styles.foot, { opacity: taglineOpacity }]}>made in india</Animated.Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
    center: { alignItems: 'center', justifyContent: 'center' },
    markWrap: { width: 110, height: 110, alignItems: 'center', justifyContent: 'center' },
    ring: { position: 'absolute', width: 90, height: 90, borderWidth: 2, borderColor: colors.accent, borderRadius: 0 },
    mark: { width: 78, height: 78, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderRadius: 0 },
    markText: { color: colors.primaryForeground, fontFamily: fonts.displayBold, fontSize: 46 },
    dot: { position: 'absolute', top: 10, right: 10, width: 9, height: 9, backgroundColor: colors.accent, borderRadius: 0 },
    word: { marginTop: 18, fontSize: 36, fontFamily: fonts.displayBold, color: colors.foreground, letterSpacing: -0.8 },
    tagline: { marginTop: 6, fontSize: 12, fontFamily: fonts.body, color: colors.mutedForeground, letterSpacing: 2, textTransform: 'uppercase' },
    foot: { position: 'absolute', bottom: 28, fontSize: 10, fontFamily: fonts.bodyBold, color: colors.mutedForeground, letterSpacing: 3, textTransform: 'uppercase' },
});
