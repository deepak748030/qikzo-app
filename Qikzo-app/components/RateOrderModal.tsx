import React, { useEffect, useMemo, useState } from 'react';
import {
    Modal, View, Text, StyleSheet, Pressable, TextInput,
    KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Star, X } from 'lucide-react-native';
import { colors, fonts, radius } from '@/lib/theme';
import { orderReviewsApi } from '@/lib/api/endpoints/orderReviews';

type Props = {
    visible: boolean;
    onClose: () => void;
    categorySlug?: string;
    serverBookingId?: string;
    onSubmitted?: (review: any) => void;
};

/** Category-aware copy so a food order doesn't ask about "medicines". */
const COPY: Record<string, { noun: string; question: string; tags: string[]; subScores: boolean }> = {
    food: {
        noun: 'food',
        question: 'How was the food?',
        tags: ['Tasty', 'Hot & fresh', 'Well packed', 'Spilled', 'Cold on arrival', 'Wrong item'],
        subScores: true,
    },
    medicines: {
        noun: 'medicines',
        question: 'How was your pharmacy order?',
        tags: ['Correct medicines', 'Sealed properly', 'Bill included', 'Wrong medicine', 'Damaged strip', 'Expiry too near'],
        subScores: true,
    },
    groceries: {
        noun: 'groceries',
        question: 'How were your groceries?',
        tags: ['Fresh', 'All items received', 'Well packed', 'Missing item', 'Damaged item', 'Poor quality'],
        subScores: true,
    },
    parcel: {
        noun: 'parcel',
        question: 'How was your parcel?',
        tags: ['Intact', 'Well handled', 'Delivered sealed', 'Damaged', 'Opened', 'Missing item'],
        subScores: false,
    },
};
const DEFAULT_COPY = {
    noun: 'order',
    question: 'How was your order?',
    tags: ['As expected', 'Well packed', 'Handled with care', 'Damaged', 'Missing item', 'Poor quality'],
    subScores: false,
};

function Stars({ value, onChange, size = 32 }: { value: number; onChange: (n: number) => void; size?: number }) {
    return (
        <View style={[styles.starRow, { gap: size > 24 ? 12 : 8 }]}>
            {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} onPress={() => onChange(n)} hitSlop={6}>
                    <Star
                        size={size}
                        color={colors.accent}
                        fill={n <= value ? colors.accent : 'transparent'}
                        strokeWidth={1.6}
                    />
                </Pressable>
            ))}
        </View>
    );
}

/**
 * Bottom-sheet for reviewing the *items* that were delivered (food, medicines,
 * groceries…). The rider is rated separately in RateRiderModal.
 */
export default function RateOrderModal({ visible, onClose, categorySlug, serverBookingId, onSubmitted }: Props) {
    const insets = useSafeAreaInsets();
    const copy = useMemo(() => COPY[(categorySlug || '').toLowerCase()] || DEFAULT_COPY, [categorySlug]);

    const [stars, setStars] = useState(0);
    const [quality, setQuality] = useState(0);
    const [packaging, setPackaging] = useState(0);
    const [accuracy, setAccuracy] = useState(0);
    const [tags, setTags] = useState<string[]>([]);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!visible) {
            setStars(0); setQuality(0); setPackaging(0); setAccuracy(0);
            setTags([]); setComment(''); setError(null); setSubmitting(false);
        }
    }, [visible]);

    const toggleTag = (t: string) =>
        setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : prev.length >= 8 ? prev : [...prev, t]));

    const submit = async () => {
        if (!serverBookingId || !stars) return;
        setSubmitting(true);
        setError(null);
        try {
            const res = await orderReviewsApi.submit({
                bookingId: serverBookingId,
                stars,
                quality: quality || undefined,
                packaging: packaging || undefined,
                accuracy: accuracy || undefined,
                comment: comment.trim() || undefined,
                tags: tags.length ? tags : undefined,
            });
            onSubmitted?.(res?.review || { stars, comment, tags });
            onClose();
        } catch (e: any) {
            setError(e?.message || 'Could not submit your review. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
                <Pressable style={styles.backdrop} onPress={onClose} />
                <View style={[styles.sheet, { paddingBottom: insets.bottom + 14 }]}>
                    <View style={styles.handle} />
                    <View style={styles.head}>
                        <Text style={styles.title}>Rate your {copy.noun}</Text>
                        <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
                            <X size={18} color={colors.foreground} />
                        </Pressable>
                    </View>

                    <ScrollView
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 4 }}
                    >
                        <Text style={styles.sub}>{copy.question}</Text>
                        <Stars value={stars} onChange={setStars} />

                        {copy.subScores ? (
                            <View style={styles.subScores}>
                                <View style={styles.subRow}>
                                    <Text style={styles.subLabel}>Quality</Text>
                                    <Stars value={quality} onChange={setQuality} size={20} />
                                </View>
                                <View style={styles.subRow}>
                                    <Text style={styles.subLabel}>Packaging</Text>
                                    <Stars value={packaging} onChange={setPackaging} size={20} />
                                </View>
                                <View style={styles.subRow}>
                                    <Text style={styles.subLabel}>Order accuracy</Text>
                                    <Stars value={accuracy} onChange={setAccuracy} size={20} />
                                </View>
                            </View>
                        ) : null}

                        <View style={styles.tagRow}>
                            {copy.tags.map((t) => {
                                const on = tags.includes(t);
                                return (
                                    <Pressable key={t} onPress={() => toggleTag(t)} style={[styles.tag, on && styles.tagOn]}>
                                        <Text style={[styles.tagText, on && styles.tagTextOn]}>{t}</Text>
                                    </Pressable>
                                );
                            })}
                        </View>

                        <TextInput
                            value={comment}
                            onChangeText={setComment}
                            placeholder={`Tell us more about your ${copy.noun} (optional)`}
                            placeholderTextColor={colors.mutedForeground}
                            multiline
                            maxLength={800}
                            style={styles.input}
                        />

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
                                    <Text style={styles.submitText}>Submit review</Text>
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
    starRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 14 },
    subScores: { marginTop: 16, paddingHorizontal: 4, gap: 10 },
    subRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    subLabel: { fontSize: 12, fontFamily: fonts.bodyBold, color: colors.foreground },
    tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16, paddingHorizontal: 4 },
    tag: {
        paddingHorizontal: 12, paddingVertical: 7,
        borderRadius: radius.pill, borderWidth: 1,
        borderColor: colors.border, backgroundColor: colors.card,
    },
    tagOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    tagText: { fontSize: 12, fontFamily: fonts.body, color: colors.foreground },
    tagTextOn: { color: colors.primaryForeground, fontFamily: fonts.bodyBold },
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
