import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react-native';
import { colors, fonts } from '@/lib/theme';

type Variant = 'success' | 'error' | 'warning' | 'info';

type Props = {
    visible: boolean;
    variant?: Variant;
    title: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    loading?: boolean;
    onConfirm?: () => void;
    onClose: () => void;
};

const ICONS: Record<Variant, { Icon: any; color: string }> = {
    success: { Icon: CheckCircle2, color: colors.success },
    error: { Icon: XCircle, color: colors.danger },
    warning: { Icon: AlertTriangle, color: colors.warning },
    info: { Icon: Info, color: colors.foreground },
};

export default function BottomSheet({
    visible, variant = 'info', title, message, confirmText = 'OK',
    cancelText, loading, onConfirm, onClose,
}: Props) {
    const insets = useSafeAreaInsets();
    const { Icon, color } = ICONS[variant];
    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={styles.backdrop} onPress={onClose} />
            <View style={[styles.sheet, { paddingBottom: insets.bottom + 14 }]}>
                <View style={styles.handle} />
                <View style={[styles.iconWrap, { borderColor: color }]}>
                    <Icon size={26} color={color} />
                </View>
                <Text style={styles.title}>{title}</Text>
                {message ? <Text style={styles.message}>{message}</Text> : null}
                <View style={styles.actions}>
                    {cancelText ? (
                        <Pressable style={[styles.btn, styles.cancelBtn]} onPress={onClose}>
                            <Text style={styles.cancelText}>{cancelText}</Text>
                        </Pressable>
                    ) : null}
                    <Pressable
                        style={[styles.btn, styles.confirmBtn]}
                        onPress={onConfirm || onClose}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator color={colors.primaryForeground} /> : (
                            <Text style={styles.confirmText}>{confirmText}</Text>
                        )}
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
    sheet: {
        backgroundColor: colors.card, paddingHorizontal: 6, paddingTop: 8,
        borderTopWidth: 1, borderColor: colors.border, alignItems: 'center', borderRadius: 0,
    },
    handle: { width: 40, height: 4, backgroundColor: colors.border, marginBottom: 10, borderRadius: 0 },
    iconWrap: { width: 52, height: 52, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', borderRadius: 0 },
    title: { color: colors.foreground, fontFamily: fonts.heading, fontSize: 16, marginTop: 10, textAlign: 'center' },
    message: { color: colors.mutedForeground, fontSize: 13, marginTop: 6, textAlign: 'center', fontFamily: fonts.body },
    actions: { flexDirection: 'row', gap: 6, marginTop: 14, width: '100%' },
    btn: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 0 },
    confirmBtn: { backgroundColor: colors.primary },
    cancelBtn: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
    cancelText: { color: colors.foreground, fontFamily: fonts.bodyBold, fontSize: 14 },
    confirmText: { color: colors.primaryForeground, fontFamily: fonts.bodyBold, fontSize: 14 },
});
