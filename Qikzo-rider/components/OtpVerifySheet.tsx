import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShieldCheck, X } from 'lucide-react-native';
import { colors, fonts, radius } from '@/lib/theme';

// Pickup OTP sheet — the customer reads out 4 digits from their app and the
// rider types them in. Only a correct code advances the job to "Picked up".
export default function OtpVerifySheet({
    visible, expected, customerName, onClose, onVerified,
}: {
    visible: boolean;
    expected: string;
    customerName: string;
    onClose: () => void;
    onVerified: () => void;
}) {
    const insets = useSafeAreaInsets();
    const [digits, setDigits] = useState(['', '', '', '']);
    const [error, setError] = useState<string | null>(null);
    const [checking, setChecking] = useState(false);
    const refs = [useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null)];

    useEffect(() => {
        if (visible) {
            setDigits(['', '', '', '']);
            setError(null);
            setChecking(false);
            setTimeout(() => refs[0].current?.focus(), 120);
        }
    }, [visible]);

    if (!visible) return null;

    const setAt = (i: number, v: string) => {
        const clean = v.replace(/\D/g, '').slice(-1);
        const next = [...digits];
        next[i] = clean;
        setDigits(next);
        setError(null);
        if (clean && i < 3) refs[i + 1].current?.focus();
        if (next.every((d) => d)) verify(next.join(''));
    };

    const onKey = (i: number, key: string) => {
        if (key === 'Backspace' && !digits[i] && i > 0) refs[i - 1].current?.focus();
    };

    const verify = (code: string) => {
        setChecking(true);
        setTimeout(() => {
            if (code === expected) {
                setChecking(false);
                onVerified();
            } else {
                setChecking(false);
                setError('Incorrect OTP. Ask the customer again.');
                setDigits(['', '', '', '']);
                refs[0].current?.focus();
            }
        }, 400);
    };

    return (
        <View style={styles.overlay}>
            <Pressable style={styles.backdrop} onPress={() => { Keyboard.dismiss(); onClose(); }} />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.kav}
                pointerEvents="box-none"
            >
            <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}
                showsVerticalScrollIndicator={false}
            >
            <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
                <View style={styles.handle} />
                <Pressable style={styles.close} onPress={() => { Keyboard.dismiss(); onClose(); }} hitSlop={8}>
                    <X size={18} color={colors.foreground} />
                </Pressable>

                <View style={styles.iconWrap}>
                    <ShieldCheck size={28} color={colors.primary} strokeWidth={2.2} />
                </View>
                <Text style={styles.title}>Verify pickup</Text>
                <Text style={styles.sub}>
                    Ask <Text style={styles.subBold}>{customerName}</Text> for the 4-digit code shown in their Qikzo app.
                </Text>

                <View style={styles.boxes}>
                    {digits.map((d, i) => (
                        <TextInput
                            key={i}
                            ref={refs[i]}
                            value={d}
                            onChangeText={(v) => setAt(i, v)}
                            onKeyPress={(e) => onKey(i, e.nativeEvent.key)}
                            keyboardType="number-pad"
                            maxLength={1}
                            style={[styles.box, d ? styles.boxFilled : null, error ? styles.boxError : null]}
                            selectionColor={colors.primary}
                        />
                    ))}
                </View>

                {error ? <Text style={styles.error}>{error}</Text> : null}
                {checking ? (
                    <View style={styles.checking}>
                        <ActivityIndicator size="small" color={colors.primary} />
                        <Text style={styles.checkingText}>Verifying…</Text>
                    </View>
                ) : (
                    <Text style={styles.hint}>Only start the trip after the code matches.</Text>
                )}
            </View>
            </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', zIndex: 40 },
    kav: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
    sheet: { backgroundColor: colors.card, paddingHorizontal: 20, paddingTop: 10, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
    handle: { alignSelf: 'center', width: 40, height: 4, backgroundColor: colors.border, borderRadius: radius.pill, marginBottom: 10 },
    close: { position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
    iconWrap: { alignSelf: 'center', width: 56, height: 56, borderRadius: radius.pill, backgroundColor: colors.chipBg, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
    title: { fontSize: 20, fontFamily: fonts.displayBold, color: colors.foreground, textAlign: 'center', marginTop: 12, letterSpacing: -0.3 },
    sub: { fontSize: 13, fontFamily: fonts.body, color: colors.mutedForeground, textAlign: 'center', marginTop: 6, lineHeight: 18, paddingHorizontal: 8 },
    subBold: { fontFamily: fonts.bodyBold, color: colors.foreground },
    boxes: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 20 },
    box: { width: 54, height: 60, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, textAlign: 'center', fontSize: 24, fontFamily: fonts.displayBold, color: colors.foreground, backgroundColor: colors.card },
    boxFilled: { borderColor: colors.primary, backgroundColor: colors.chipBg },
    boxError: { borderColor: colors.danger },
    error: { marginTop: 12, textAlign: 'center', fontSize: 12, fontFamily: fonts.bodyBold, color: colors.danger },
    hint: { marginTop: 14, textAlign: 'center', fontSize: 11, fontFamily: fonts.body, color: colors.mutedForeground },
    checking: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14 },
    checkingText: { fontSize: 12, fontFamily: fonts.bodyBold, color: colors.primary },
});
