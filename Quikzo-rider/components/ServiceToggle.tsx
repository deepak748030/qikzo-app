import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Bike, PackageOpen } from 'lucide-react-native';
import { colors, fonts, radius } from '@/lib/theme';

export type ServiceMode = 'ride' | 'delivery';

type Props = {
    value: ServiceMode;
    onChange: (m: ServiceMode) => void;
};

// Pill segmented tabs — sits inside the Sand Dune header band. Active pill is Cyprus.
export default function ServiceToggle({ value, onChange }: Props) {
    return (
        <View style={styles.track}>
            <Segment active={value === 'ride'} Icon={Bike} label="Rides" onPress={() => onChange('ride')} />
            <Segment active={value === 'delivery'} Icon={PackageOpen} label="Delivery" onPress={() => onChange('delivery')} />
        </View>
    );
}

function Segment({
    active, Icon, label, onPress,
}: { active: boolean; Icon: any; label: string; onPress: () => void }) {
    return (
        <Pressable onPress={onPress} style={[styles.seg, active && styles.segActive]} hitSlop={4}>
            <Icon size={15} color={active ? colors.primaryForeground : colors.primary} strokeWidth={active ? 2.4 : 2} />
            <Text style={[styles.segText, active && styles.segTextActive]}>{label}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    track: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.pill,
        padding: 3,
        gap: 3,
    },
    seg: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 8,
        borderRadius: radius.pill,
    },
    segActive: { backgroundColor: colors.primary },
    segText: { fontSize: 13, fontFamily: fonts.displayBold, color: colors.primary, letterSpacing: 0.2 },
    segTextActive: { color: colors.primaryForeground },
});
