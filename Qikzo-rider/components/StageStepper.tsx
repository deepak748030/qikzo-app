import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { colors, fonts, radius } from '@/lib/theme';
import { JOB_STAGES, JobStage } from '@/lib/mockData';

// Compact 4-step progress showing the rider's current stage.
export default function StageStepper({ stage }: { stage: JobStage }) {
    const idx = JOB_STAGES.indexOf(stage);
    // Every stage except 'Heading to pickup' is a PAST event — 'Arrived at
    // pickup' / 'Picked up' / 'Delivered' have already happened when they
    // become the current stage, so the matched step itself renders TICKED.
    // 'Heading to pickup' is in-progress and stays active without a tick.
    // Previously `done` was `i < idx`, which left the current step (and the
    // final 'Delivered' step) without a tick forever.
    const currentDone = stage !== 'Heading to pickup';
    return (
        <View style={styles.wrap}>
            {JOB_STAGES.map((s, i) => {
                const done = i < idx || (i === idx && currentDone);
                const active = i === idx && !done;
                return (
                    <React.Fragment key={s}>
                        <View style={styles.slot}>
                            <View style={[styles.dot, done && styles.dotDone, active && styles.dotActive]}>
                                {done ? <Check size={12} color={colors.primaryForeground} strokeWidth={3} /> : (
                                    <Text style={[styles.dotNum, active && styles.dotNumActive]}>{i + 1}</Text>
                                )}
                            </View>
                            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={2}>{s}</Text>
                        </View>
                        {i < JOB_STAGES.length - 1 ? (
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
