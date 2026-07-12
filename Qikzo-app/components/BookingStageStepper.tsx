import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { colors, fonts, radius } from '@/lib/theme';
import type { BookingStatus } from '@/lib/mockData';

// Condensed 4-step progress mirroring the rider app's StageStepper look.
// Customer flow has 6 statuses; we merge into 4 rider-parity beats.
const STEPS: { label: string; matches: BookingStatus[] }[] = [
    { label: 'Accepted', matches: ['Rider accepted'] },
    { label: 'Arriving', matches: ['Arriving for pickup'] },
    { label: 'Picked up', matches: ['Picked up', 'On the way'] },
    { label: 'Delivered', matches: ['Delivered'] },
];

function indexFor(status: BookingStatus): number {
    // Before any rider accepts, all steps are pending.
    if (status === 'Searching rider' || status === 'Cancelled') return -1;
    for (let i = 0; i < STEPS.length; i++) {
        if (STEPS[i].matches.includes(status)) return i;
    }
    return -1;
}

export default function BookingStageStepper({ status }: { status: BookingStatus }) {
    const idx = indexFor(status);
    return (
        <View style={styles.wrap}>
            {STEPS.map((s, i) => {
                const done = i < idx;
                const active = i === idx;
                return (
                    <React.Fragment key={s.label}>
                        <View style={styles.slot}>
                            <View style={[styles.dot, done && styles.dotDone, active && styles.dotActive]}>
                                {done ? <Check size={12} color={colors.primaryForeground} strokeWidth={3} /> : (
                                    <Text style={[styles.dotNum, active && styles.dotNumActive]}>{i + 1}</Text>
                                )}
                            </View>
                            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={2}>{s.label}</Text>
                        </View>
                        {i < STEPS.length - 1 ? (
                            <View style={[styles.bar, i < idx && styles.barDone]} />
                        ) : null}
                    </React.Fragment>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 4 },
    slot: { alignItems: 'center', width: 62 },
    dot: { width: 26, height: 26, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
    dotActive: { borderColor: colors.primary, backgroundColor: colors.card },
    dotDone: { backgroundColor: colors.primary, borderColor: colors.primary },
    dotNum: { fontSize: 12, fontFamily: fonts.displayBold, color: colors.mutedForeground },
    dotNumActive: { color: colors.primary },
    label: { marginTop: 4, fontSize: 10, fontFamily: fonts.body, color: colors.mutedForeground, textAlign: 'center', lineHeight: 12 },
    labelActive: { color: colors.foreground, fontFamily: fonts.bodyBold },
    bar: { flex: 1, height: 2, backgroundColor: colors.border, marginTop: 12 },
    barDone: { backgroundColor: colors.primary },
});
