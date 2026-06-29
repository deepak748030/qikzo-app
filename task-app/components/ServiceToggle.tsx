import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Bike, Package } from 'lucide-react-native';
import { colors, fonts } from '@/lib/theme';

export type ServiceMode = 'ride' | 'delivery';

type Props = {
    value: ServiceMode;
    onChange: (m: ServiceMode) => void;
};

// Underlined segmented control inspired by the reference (Rides | Delivery).
export default function ServiceToggle({ value, onChange }: Props) {
    return (
        <View style={styles.row}>
            <Segment
                active={value === 'ride'}
                Icon={Bike}
                label="Rides"
                onPress={() => onChange('ride')}
            />
            <Segment
                active={value === 'delivery'}
                Icon={Package}
                label="Delivery"
                onPress={() => onChange('delivery')}
            />
        </View>
    );
}

function Segment({
    active, Icon, label, onPress,
}: { active: boolean; Icon: any; label: string; onPress: () => void }) {
    return (
        <Pressable onPress={onPress} style={styles.segWrap} hitSlop={6}>
            <View style={styles.segInner}>
                <Icon size={16} color={active ? colors.primary : colors.mutedForeground} strokeWidth={active ? 2.4 : 1.8} />
                <Text style={[styles.segText, active && styles.segTextActive]}>{label}</Text>
            </View>
            <View style={[styles.underline, active && styles.underlineActive]} />
        </Pressable>
    );
}

const styles = StyleSheet.create({
    row: { flexDirection: 'row', gap: 18, paddingHorizontal: 6 },
    segWrap: { alignItems: 'center' },
    segInner: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingBottom: 6 },
    segText: { fontSize: 14, fontFamily: fonts.heading, color: colors.mutedForeground },
    segTextActive: { color: colors.primary },
    underline: { height: 2, width: '100%', backgroundColor: 'transparent' },
    underlineActive: { backgroundColor: colors.primary },
});