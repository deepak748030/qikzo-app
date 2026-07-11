import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { FileCheck2, Upload } from 'lucide-react-native';
import { colors, fonts, radius } from '@/lib/theme';
import ScreenHeader from '@/components/ScreenHeader';
import BottomSheet from '@/components/BottomSheet';
import { useSheet } from '@/lib/useSheet';
import { documents as MOCK_DOCS } from '@/lib/mockData';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/authStore';

const STATUS_COLOR = {
    verified: colors.success,
    approved: colors.success,
    pending: colors.warning,
    submitted: colors.warning,
    rejected: colors.danger,
} as const;

// Kinds the rider app supports uploading (subset of server DOCUMENT_KINDS).
const REQUIRED = [
    { kind: 'dl_front', name: 'Driving licence (front)' },
    { kind: 'dl_back', name: 'Driving licence (back)' },
    { kind: 'rc_front', name: 'Vehicle RC' },
    { kind: 'insurance', name: 'Insurance' },
    { kind: 'aadhaar_front', name: 'Aadhaar (front)' },
    { kind: 'pan', name: 'PAN card' },
    { kind: 'profile_photo', name: 'Profile photo' },
] as const;

type Row = { id: string; kind: string; name: string; status: string; updatedAt: string };

function fmtDate(iso?: string) {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleDateString(); } catch { return iso; }
}

export default function Documents() {
    const sheet = useSheet();
    const phone = useAuth((s) => s.phone);
    const [rows, setRows] = useState<Row[]>(
        MOCK_DOCS.map((d) => ({ id: d.id, kind: d.id, name: d.name, status: d.status, updatedAt: d.updatedAt })),
    );
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [busyKind, setBusyKind] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!phone) return;
        setLoading(true);
        try {
            const items = await api.documents.list();
            const byKind: Record<string, Row> = {};
            for (const it of items) {
                byKind[it.kind] = {
                    id: it._id,
                    kind: it.kind,
                    name: REQUIRED.find((r) => r.kind === it.kind)?.name || it.kind,
                    status: it.status,
                    updatedAt: fmtDate(it.updatedAt),
                };
            }
            const merged: Row[] = REQUIRED.map((r) => byKind[r.kind] || {
                id: r.kind, kind: r.kind, name: r.name, status: 'pending', updatedAt: 'Not uploaded',
            });
            setRows(merged);
        } catch {
            // keep whatever was in state
        } finally {
            setLoading(false);
        }
    }, [phone]);

    useEffect(() => { load(); }, [load]);

    const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

    const upload = async (kind: string, name: string) => {
        if (!phone) {
            sheet.show({ variant: 'info', title: `Upload ${name}`, message: 'Sign in first to upload documents.' });
            return;
        }
        setBusyKind(kind);
        try {
            // Placeholder URL — plug in a real picker + upload flow later.
            const stub = `https://qikzo.uploads/${kind}-${Date.now()}.jpg`;
            await api.documents.upload({ kind, url: stub, mimeType: 'image/jpeg' });
            await load();
            sheet.show({ variant: 'success', title: `${name} submitted`, message: 'We\'ll verify it within 24 hours.' });
        } catch (e: any) {
            sheet.show({ variant: 'error', title: 'Upload failed', message: e?.message || 'Try again in a moment.' });
        } finally {
            setBusyKind(null);
        }
    };

    return (
        <View style={styles.container}>
            <ScreenHeader title="Documents" />
            <ScrollView
                contentContainerStyle={{ padding: 6, paddingBottom: 24 }}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.foreground} />}
            >
                <Text style={styles.lead}>
                    Keep your documents up to date to stay eligible for jobs. All uploads are verified within 24 hours.
                </Text>

                <View style={styles.list}>
                    {rows.map((d) => {
                        const color = STATUS_COLOR[d.status as keyof typeof STATUS_COLOR] || colors.warning;
                        const busy = busyKind === d.kind;
                        return (
                            <View key={d.kind} style={styles.row}>
                                <View style={styles.iconWrap}>
                                    <FileCheck2 size={18} color={colors.primary} strokeWidth={2} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.name}>{d.name}</Text>
                                    <Text style={styles.sub}>{d.updatedAt}</Text>
                                </View>
                                <View style={[styles.pill, { borderColor: color }]}>
                                    <Text style={[styles.pillText, { color }]}>{d.status}</Text>
                                </View>
                                <Pressable style={styles.uploadBtn} onPress={() => upload(d.kind, d.name)} disabled={busy} hitSlop={6}>
                                    {busy ? <ActivityIndicator size="small" color={colors.foreground} /> : <Upload size={16} color={colors.foreground} />}
                                </Pressable>
                            </View>
                        );
                    })}
                </View>
                {loading && !refreshing ? (
                    <View style={{ paddingVertical: 16, alignItems: 'center' }}><ActivityIndicator size="small" color={colors.foreground} /></View>
                ) : null}
            </ScrollView>

            <BottomSheet visible={sheet.visible} {...sheet.config} onClose={sheet.hide} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    lead: { fontSize: 13, fontFamily: fonts.body, color: colors.mutedForeground, lineHeight: 20, paddingHorizontal: 6 },
    list: { marginTop: 12, backgroundColor: colors.card, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.divider },
    iconWrap: { width: 34, height: 34, borderRadius: radius.sm, backgroundColor: colors.chipBg, alignItems: 'center', justifyContent: 'center' },
    name: { fontSize: 14, fontFamily: fonts.bodyBold, color: colors.foreground },
    sub: { fontSize: 11, fontFamily: fonts.body, color: colors.mutedForeground, marginTop: 2 },
    pill: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
    pillText: { fontSize: 10, fontFamily: fonts.bodyBold, letterSpacing: 0.4, textTransform: 'uppercase' },
    uploadBtn: { width: 32, height: 32, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
});
