import React from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { colors, fonts, radius } from '@/lib/theme';

// Shared UI primitives — one source of truth for the repeated card / row /
// section-label patterns. Every screen used to inline these styles; centralising
// them keeps each screen short and guarantees identical visuals across the app.

export function SectionLabel({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
    return <Text style={[ui.section, style]}>{children}</Text>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
    return <View style={[ui.card, style]}>{children}</View>;
}

// Row used inside settings menus — icon on the left, label, chevron on the right.
export function MenuRow({
    icon: Icon, label, onPress, danger, iconColor,
}: {
    icon: any;
    label: string;
    onPress: () => void;
    danger?: boolean;
    iconColor?: string;
}) {
    const tint = danger ? colors.danger : iconColor ?? colors.foreground;
    return (
        <Pressable style={ui.menuRow} onPress={onPress}>
            <Icon size={18} color={tint} strokeWidth={2} />
            <Text style={[ui.menuLabel, danger && { color: colors.danger }]}>{label}</Text>
            <ChevronRight size={18} color={colors.mutedForeground} />
        </Pressable>
    );
}

// Single column in a stat strip: uppercase label + large value.
export function StatCol({ label, value, flex }: { label: string; value: string; flex?: number }) {
    return (
        <View style={[ui.statCol, flex ? { flex } : null]}>
            <Text style={ui.statLabel}>{label}</Text>
            <Text style={ui.statValue}>{value}</Text>
        </View>
    );
}

export const StatDivider = () => <View style={ui.statDivider} />;

const ui = StyleSheet.create({
    section: {
        fontSize: 11, fontFamily: fonts.bodyBold, color: colors.mutedForeground,
        letterSpacing: 0.6, textTransform: 'uppercase',
        paddingHorizontal: 12, marginTop: 18, marginBottom: 8,
    },
    card: {
        backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
        borderRadius: radius.md, padding: 12,
    },
    menuRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingVertical: 13, paddingHorizontal: 12,
        borderBottomWidth: 1, borderBottomColor: colors.divider,
    },
    menuLabel: { flex: 1, fontSize: 14, fontFamily: fonts.body, color: colors.foreground },
    statCol: { alignItems: 'center', paddingHorizontal: 12 },
    statLabel: {
        fontSize: 10, fontFamily: fonts.bodyBold, color: colors.mutedForeground,
        letterSpacing: 0.5, textTransform: 'uppercase',
    },
    statValue: {
        fontSize: 16, fontFamily: fonts.displayBold, color: colors.foreground,
        marginTop: 3, letterSpacing: -0.3,
    },
    statDivider: { width: 1, height: 28, backgroundColor: colors.border },
});
