import React, { useEffect, useState } from 'react';
import {
    Modal, View, Text, StyleSheet, Pressable, TextInput,
    KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Star, Gift, X } from 'lucide-react-native';
import { colors, fonts, radius } from '@/lib/theme';
import Button from '@/components/Button';
import { ratingsApi } from '@/lib/api/endpoints/ratings';

type Props = {
    visible: boolean;
    onClose: () => void;
    riderName: string;
    serverBookingId?: string;
    onSubmitted?: (rating: any) => void;
};

/**
 * Bottom-sheet modal for rating the rider after Delivered. Stars + optional
 * comment + optional tip. User can Skip anytime. Fully separate from the
 * booking details screen so nothing overlaps in-flow.
 */
export default function RateRiderModal({ visible, onClose, riderName, serverBookingId, onSubmitted }: Props) {
    const insets = useSafeAreaInsets();
    const [stars, setStars] = useState(0);
    const [comment, setComment] = useState('');
    const [tip, setTip] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!visible) {
            setStars(0); setComment(''); setTip(0); setError(null); setSubmitting(false);
        }
    }, [visible]);

    const submit = async () => {
        if (!serverBookingId || !stars) return;
        setSubmitting(true);
        setError(null);
        try {
            const res = await ratingsApi.submit({
                bookingId: serverBookingId,
                stars,
                comment: comment.trim() || undefined,
                tip: tip > 0 ? tip : undefined,
            });
            onSubmitted?.(res?.rating || { stars, comment, tip });
            onClose();
        } catch (e: any) {
            setError(e?.message || 'Could not submit rating. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const first = (riderName || 'rider').split(' ')[0];

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.fill}
            >
                <Pressable style={styles.backdrop} onPress={onClose} />
                <View style={[styles.sheet, { paddingBottom: insets.bottom + 14 }]}>
                    <View style={styles.handle} />
                    <View style={styles.head}>
                        <Text style={styles.title}>Rate your rider</Text>
                        <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
                            <X size={18} color={colors.foreground} />
                        </Pressable>
                    </View>
                    <ScrollView
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 4 }}
                    >
                        <Text style={styles.sub}>How was your trip with {first}?</Text>

                        <View style={styles.starRow}>
                            {[1, 2, 3, 4, 5].map((n) => (
                                <Pressable key={n} onPress={() => setStars(n)} hitSlop={8}>
                                    <Star
                                        size={34}
                                        color={colors.accent}
                                        fill={n <= stars ? colors.accent : 'transparent'}
                                        strokeWidth={1.6}
                                    />
                                </Pressable>
                            ))}
                        </View>

                        <TextInput
                            value={comment}
                            onChangeText={setComment}
                            placeholder={`Leave a note for ${first} (optional)`}
                            placeholderTextColor={colors.mutedForeground}
                            multiline
                            maxLength={500}
                            style={styles.input}
                        />

                        <View style={styles.tipHead}>
                            <Gift size={13} color={colors.foreground} />
                            <Text style={styles.tipHeadText}>Add a tip for {first}</Text>
                        </View>
                        <View style={styles.tipRow}>
                            {[0, 20, 50, 100].map((amt) => {
                                const on = tip === amt;
                                return (
                                    <Pressable
                                        key={amt}
                                        onPress={() => setTip(amt)}
                                        style={[styles.tipChip, on && styles.tipChipOn]}
                                    >
                                        <Text style={[styles.tipChipText, on && styles.tipChipTextOn]}>
                                            {amt === 0 ? 'No tip' : `₹${amt}`}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>

                        {error ? <Text style={styles.error}>{error}</Text> : null}

                        <View style={styles.actions}>
                            <Pressable style={styles.skipBtn} onPress={onClose} disabled={submitting}>
                                <Text style={styles.skipText}>Skip</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.submitBtn, (!stars || submitting) && styles.submitBtnDisabled]}
                                onPress={submit}
                                disabled={!stars || submitting}
                            >
                                {submitting ? (
                                    <ActivityIndicator color={colors.primaryForeground} />
                                ) : (
                                    <Text style={styles.submitText}>
                                        {tip > 0 ? `Submit · ₹${tip} tip` : 'Submit rating'}
                                    </Text>
                                )}
                            </Pressable>
                        </View>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    fill: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
    sheet: {
        backgroundColor: colors.card,
        paddingHorizontal: 6,
        paddingTop: 8,
        borderTopWidth: 1,
        borderColor: colors.border,
        borderTopLeftRadius: radius.md,
        borderTopRightRadius: radius.md,
        maxHeight: '90%',
    },
    handle: { alignSelf: 'center', width: 40, height: 4, backgroundColor: colors.border, marginBottom: 10 },
    head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
    title: { fontSize: 16, fontFamily: fonts.heading, color: colors.foreground },
    closeBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
    sub: { fontSize: 12, fontFamily: fonts.body, color: colors.mutedForeground, marginTop: 6, paddingHorizontal: 4 },
    starRow: { flexDirection: 'row', gap: 12, justifyContent: 'center', marginTop: 14 },
    input: {
        marginTop: 14,
        minHeight: 72,
        backgroundColor: colors.inputBg,
        borderWidth: 1,
        borderColor: colors.inputBorder,
        borderRadius: radius.sm,
        paddingHorizontal: 10,
        paddingVertical: 8,
        fontFamily: fonts.body,
        fontSize: 13,
        color: colors.foreground,
        textAlignVertical: 'top',
    },
    tipHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, paddingHorizontal: 4 },
    tipHeadText: { fontSize: 12, fontFamily: fonts.bodyBold, color: colors.foreground },
    tipRow: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap', paddingHorizontal: 4 },
    tipChip: {
        paddingHorizontal: 14, paddingVertical: 8,
        borderRadius: radius.pill, borderWidth: 1,
        borderColor: colors.border, backgroundColor: colors.card,
    },
    tipChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    tipChipText: { fontSize: 12, fontFamily: fonts.bodyBold, color: colors.foreground },
    tipChipTextOn: { color: colors.primaryForeground },
    error: { color: colors.danger, fontSize: 12, fontFamily: fonts.body, marginTop: 10, paddingHorizontal: 4 },
    actions: { flexDirection: 'row', gap: 8, marginTop: 16 },
    skipBtn: {
        flex: 1, height: 46, alignItems: 'center', justifyContent: 'center',
        borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card,
    },
    skipText: { color: colors.foreground, fontFamily: fonts.bodyBold, fontSize: 14, letterSpacing: 1.2 },
    submitBtn: {
        flex: 2, height: 46, alignItems: 'center', justifyContent: 'center',
        borderRadius: radius.sm, backgroundColor: colors.primary,
    },
    submitBtnDisabled: { opacity: 0.5 },
    submitText: { color: colors.primaryForeground, fontFamily: fonts.bodyBold, fontSize: 14, letterSpacing: 1.2 },
});
