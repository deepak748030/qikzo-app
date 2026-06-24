import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react-native';
import { colors } from '@/lib/theme';

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

const ICONS: Record<Variant, { Icon: any; color: string; bg: string }> = {
    success: { Icon: CheckCircle2, color: colors.success, bg: '#DCFCE7' },
    error: { Icon: XCircle, color: colors.danger, bg: '#FEE2E2' },
    warning: { Icon: AlertTriangle, color: colors.warning, bg: '#FEF3C7' },
    info: { Icon: Info, color: colors.primary, bg: '#DBEAFE' },
};

export default function BottomSheet({
    visible, variant = 'info', title, message, confirmText = 'OK',
    cancelText, loading, onConfirm, onClose,
}: Props) {
    const { Icon, color, bg } = ICONS[variant];
    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={styles.backdrop} onPress={onClose} />
            <View style={styles.sheet}>
                <View style={styles.handle} />
                <View style={[styles.iconWrap, { backgroundColor: bg }]}>
                    <Icon size={28} color={color} />
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
                        style={[styles.btn, { backgroundColor: color, flex: 1 }]}
                        onPress={onConfirm || onClose}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator color="#FFFFFF" /> : (
                            <Text style={styles.confirmText}>{confirmText}</Text>
                        )}
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
    sheet: {
        backgroundColor: colors.card, paddingHorizontal: 6, paddingTop: 8, paddingBottom: 18,
        borderTopLeftRadius: 12, borderTopRightRadius: 12, alignItems: 'center',
    },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 8 },
    iconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
    title: { color: colors.foreground, fontWeight: '800', fontSize: 16, marginTop: 8, textAlign: 'center' },
    message: { color: colors.mutedForeground, fontSize: 12, marginTop: 4, textAlign: 'center' },
    actions: { flexDirection: 'row', gap: 6, marginTop: 12, width: '100%' },
    btn: { paddingVertical: 10, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
    cancelBtn: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
    cancelText: { color: colors.foreground, fontWeight: '700', fontSize: 13 },
    confirmText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
});
