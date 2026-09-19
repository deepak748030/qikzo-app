import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MapPin, Navigation2 } from 'lucide-react-native';
import { colors, fonts, radius } from '@/lib/theme';
import { CATEGORY_META, IncomingJob } from '@/lib/mockData';
import Button from './Button';

type Props = {
    job: IncomingJob;
    onAccept: () => void;
    onDecline: () => void;
    accepting?: boolean;
};

// Card shown when a new job arrives — has a countdown ring that auto-declines.
export default function JobRequestCard({ job, onAccept, onDecline, accepting }: Props) {
    const [left, setLeft] = useState(job.expiresInSec);
    const cat = CATEGORY_META[job.category];

    useEffect(() => {
        setLeft(job.expiresInSec);
        const t = setInterval(() => {
            setLeft((v) => (v <= 0 ? 0 : v - 1));
        }, 1000);
        return () => clearInterval(t);
    }, [job.id, job.expiresInSec]);

    useEffect(() => {
        if (left <= 0) onDecline();
    }, [left]);

    return (
        <View style={styles.card}>
            <View style={styles.head}>
                <View style={styles.badge}>
                    <Text style={styles.badgeEmoji}>{cat.emoji}</Text>
                    <Text style={styles.badgeLabel}>{cat.label}</Text>
                </View>
                <View style={styles.timer}>
                    <Text style={styles.timerText}>{left}s</Text>
                </View>
            </View>

            <View style={styles.moneyRow}>
                <Text style={styles.fare}>₹{job.fare}</Text>
                <Text style={styles.distance}>{job.distanceKm.toFixed(1)} km · {job.etaMin} min</Text>
            </View>

            <View style={styles.stops}>
                <Stop icon="pickup" label={(job.extraPickups?.length || 0) > 0 ? 'Pickup 1' : 'Pickup'} value={job.pickup} />
                {(job.extraPickups || []).map((s, i) => (
                    <React.Fragment key={i}>
                        <View style={styles.dash} />
                        <Stop icon="pickup" label={`Pickup ${i + 2}`} value={s.address} />
                    </React.Fragment>
                ))}
                <View style={styles.dash} />
                <Stop icon="drop" label="Drop" value={job.drop} />
            </View>

            {job.notes ? <Text style={styles.notes}>Note: {job.notes}</Text> : null}

            <View style={styles.actions}>
                <Pressable style={[styles.decline, accepting && { opacity: 0.5 }]} onPress={accepting ? undefined : onDecline} hitSlop={6} disabled={accepting}>
                    <Text style={styles.declineText}>Decline</Text>
                </Pressable>
                <Button label="Accept" onPress={onAccept} loading={accepting} disabled={accepting} style={styles.accept} />
            </View>
        </View>
    );
}

function Stop({ icon, label, value }: { icon: 'pickup' | 'drop'; label: string; value: string }) {
    const Icon = icon === 'pickup' ? MapPin : Navigation2;
    const tint = icon === 'pickup' ? colors.accent : colors.primary;
    return (
        <View style={styles.stopRow}>
            <View style={[styles.stopDot, { borderColor: tint }]}>
                <Icon size={12} color={tint} strokeWidth={2.4} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.stopLabel}>{label}</Text>
                <Text style={styles.stopValue} numberOfLines={1}>{value}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12 },
    head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    badge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.chipBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill },
    badgeEmoji: { fontSize: 14 },
    badgeLabel: { fontSize: 11, fontFamily: fonts.bodyBold, color: colors.foreground },
    timer: { width: 36, height: 36, borderRadius: radius.pill, borderWidth: 2, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    timerText: { fontSize: 12, fontFamily: fonts.displayBold, color: colors.primary },
    moneyRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 10 },
    fare: { fontSize: 28, fontFamily: fonts.displayBold, color: colors.foreground, letterSpacing: -0.5 },
    distance: { fontSize: 12, fontFamily: fonts.body, color: colors.mutedForeground },
    stops: { marginTop: 12, gap: 6 },
    stopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    stopDot: { width: 22, height: 22, borderRadius: radius.pill, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
    stopLabel: { fontSize: 10, fontFamily: fonts.bodyBold, color: colors.mutedForeground, letterSpacing: 0.5, textTransform: 'uppercase' },
    stopValue: { fontSize: 13, fontFamily: fonts.body, color: colors.foreground },
    dash: { height: 10, width: 1, backgroundColor: colors.border, marginLeft: 11 },
    notes: { marginTop: 10, fontSize: 12, fontFamily: fonts.body, color: colors.mutedForeground, backgroundColor: colors.chipBg, padding: 8, borderRadius: radius.sm },
    actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
    decline: { flex: 1, height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.border },
    declineText: { fontSize: 14, fontFamily: fonts.bodyBold, color: colors.foreground, letterSpacing: 0.3 },
    accept: { flex: 1.4 },
});
