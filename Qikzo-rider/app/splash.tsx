import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { router } from 'expo-router';
import { Bike } from 'lucide-react-native';
import { colors, fonts, radius } from '@/lib/theme';
import { useAuth } from '@/lib/authStore';

// Animated splash — routes based on onboarded + phone.
export default function SplashAnimated() {
    const onboarded = useAuth((s) => s.onboarded);
    const phone = useAuth((s) => s.phone);
    const profileComplete = useAuth((s) => s.profileComplete);

    const markScale = useRef(new Animated.Value(0.4)).current;
    const markOpacity = useRef(new Animated.Value(0)).current;
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
            else if (!profileComplete) router.replace('/vehicle-setup');
            else router.replace('/(tabs)');
        }, 1800);
        return () => clearTimeout(t);
    }, []);

    return (
        <View style={styles.container}>
            <View style={styles.center}>
                <View style={styles.markWrap}>
                    <Animated.View style={[styles.ring, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />
                    <Animated.View style={[styles.mark, { opacity: markOpacity, transform: [{ scale: markScale }] }]}>
                        <Bike size={44} color={colors.primaryForeground} strokeWidth={2.4} />
                        <View style={styles.dot} />
                    </Animated.View>
                </View>
                <Animated.Text style={[styles.word, { opacity: wordOpacity, transform: [{ translateY: wordTranslate }] }]}>
                    Qikzo Partner
                </Animated.Text>
                <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>drive. deliver. earn.</Animated.Text>
            </View>
            <Animated.Text style={[styles.foot, { opacity: taglineOpacity }]}>made in india</Animated.Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
    center: { alignItems: 'center', justifyContent: 'center' },
    markWrap: { width: 110, height: 110, alignItems: 'center', justifyContent: 'center' },
    ring: { position: 'absolute', width: 90, height: 90, borderRadius: 90, backgroundColor: colors.accent },
    mark: { width: 82, height: 82, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
    dot: { position: 'absolute', top: 10, right: 10, width: 9, height: 9, backgroundColor: colors.accent, borderRadius: radius.lg },
    word: { marginTop: 18, fontSize: 30, fontFamily: fonts.displayBold, color: colors.foreground, letterSpacing: -0.8 },
    tagline: { marginTop: 6, fontSize: 12, fontFamily: fonts.body, color: colors.mutedForeground, letterSpacing: 2, textTransform: 'uppercase' },
    foot: { position: 'absolute', bottom: 28, fontSize: 10, fontFamily: fonts.bodyBold, color: colors.mutedForeground, letterSpacing: 3, textTransform: 'uppercase' },
});
