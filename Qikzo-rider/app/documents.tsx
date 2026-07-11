import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, ActivityIndicator, Image } from 'react-native';
import { FileCheck2, Upload, ImagePlus, FileText } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { colors, fonts, radius } from '@/lib/theme';
import ScreenHeader from '@/components/ScreenHeader';
import BottomSheet from '@/components/BottomSheet';
import { useSheet } from '@/lib/useSheet';
import { api } from '@/lib/api';
import { uploadFile } from '@/lib/api/endpoints/uploads';
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

type Row = { id: string; kind: string; name: string; status: string; updatedAt: string; url?: string; mimeType?: string };

function fmtDate(iso?: string) {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleDateString(); } catch { return iso; }
}

// Empty-state rows so the list always renders, even before the server responds
// and for brand-new accounts with zero uploads.
const EMPTY_ROWS: Row[] = REQUIRED.map((r) => ({
    id: r.kind, kind: r.kind, name: r.name, status: 'pending', updatedAt: 'Not uploaded',
}));

export default function Documents() {
    const sheet = useSheet();
    const phone = useAuth((s) => s.phone);
    const [rows, setRows] = useState<Row[]>(EMPTY_ROWS);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [busyKind, setBusyKind] = useState<string | null>(null);
    // Which row currently has the "Pick source" chooser sheet open.
    const [pickerFor, setPickerFor] = useState<{ kind: string; name: string } | null>(null);

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
                    url: it.url,
                    mimeType: it.mimeType,
                };
            }
            const merged: Row[] = REQUIRED.map((r) => byKind[r.kind] || {
                id: r.kind, kind: r.kind, name: r.name, status: 'pending', updatedAt: 'Not uploaded',
            });
            setRows(merged);
        } catch {
            // Keep the empty scaffold on failure so the screen never shows mock data.
        } finally {
            setLoading(false);
        }
    }, [phone]);

    useEffect(() => { load(); }, [load]);

    const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

    // Two paths: (1) native photo picker (gallery), (2) any file/PDF picker.
    // Both push the picked file to the server (multipart) and then register
    // the returned URL as a rider document.
    const doUpload = async (kind: string, name: string, source: 'camera' | 'gallery' | 'file') => {
        if (!phone) {
            sheet.show({ variant: 'info', title: `Upload ${name}`, message: 'Sign in first to upload documents.' });
            return;
        }
        setBusyKind(kind);
        try {
            let localUri = '';
            let fileName = `${kind}-${Date.now()}`;
            let mimeType = 'image/jpeg';
            let sizeBytes: number | undefined;

            if (source === 'camera') {
                const perm = await ImagePicker.requestCameraPermissionsAsync();
                if (!perm.granted) throw new Error('Camera permission is required to capture the document.');
                const res = await ImagePicker.launchCameraAsync({ quality: 0.85, mediaTypes: ImagePicker.MediaTypeOptions.Images });
                if (res.canceled || !res.assets?.length) return;
                const a = res.assets[0];
                localUri = a.uri; fileName = a.fileName || `${kind}.jpg`; mimeType = a.mimeType || 'image/jpeg'; sizeBytes = a.fileSize;
            } else if (source === 'gallery') {
                const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (!perm.granted) throw new Error('Photo library permission is required.');
                const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.85, mediaTypes: ImagePicker.MediaTypeOptions.Images });
                if (res.canceled || !res.assets?.length) return;
                const a = res.assets[0];
                localUri = a.uri; fileName = a.fileName || `${kind}.jpg`; mimeType = a.mimeType || 'image/jpeg'; sizeBytes = a.fileSize;
            } else {
                const res = await DocumentPicker.getDocumentAsync({
                    type: ['image/*', 'application/pdf'],
                    multiple: false,
                    copyToCacheDirectory: true,
                });
                if (res.canceled || !res.assets?.length) return;
                const a = res.assets[0];
                localUri = a.uri; fileName = a.name || `${kind}`; mimeType = a.mimeType || 'application/pdf'; sizeBytes = a.size ?? undefined;
            }

            // 1) Push the binary to the server, receive a stable URL.
            const uploaded = await uploadFile({ localUri, name: fileName, mimeType });
            // 2) Register that URL as the rider document of this kind.
            await api.documents.upload({
                kind,
                url: uploaded.absoluteUrl || uploaded.url,
                mimeType: uploaded.mimeType,
                sizeBytes: uploaded.sizeBytes ?? sizeBytes,
            });
            await load();
            sheet.show({ variant: 'success', title: `${name} submitted`, message: 'We\'ll verify it within 24 hours.' });
        } catch (e: any) {
            sheet.show({ variant: 'error', title: 'Upload failed', message: e?.message || 'Try again in a moment.' });
        } finally {
            setBusyKind(null);
        }
    };

    // Show the "choose a source" bottom sheet for the tapped row.
    const openPicker = (kind: string, name: string) => setPickerFor({ kind, name });

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
                        const isImg = d.url && (!d.mimeType || d.mimeType.startsWith('image/'));
                        return (
                            <View key={d.kind} style={styles.row}>
                                {isImg ? (
                                    <Image source={{ uri: d.url }} style={styles.thumb} />
                                ) : d.url ? (
                                    <View style={[styles.thumb, styles.thumbFile]}><Text style={styles.thumbFileText}>PDF</Text></View>
                                ) : (
                                    <View style={styles.iconWrap}>
                                        <FileCheck2 size={18} color={colors.primary} strokeWidth={2} />
                                    </View>
                                )}
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.name}>{d.name}</Text>
                                    <Text style={styles.sub}>{d.url ? `Uploaded · ${d.updatedAt}` : d.updatedAt}</Text>
                                </View>
                                <View style={[styles.pill, { borderColor: color }]}>
                                    <Text style={[styles.pillText, { color }]}>{d.status}</Text>
                                </View>
                                <Pressable style={styles.uploadBtn} onPress={() => openPicker(d.kind, d.name)} disabled={busy} hitSlop={6}>
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

            {/* Source chooser — visible when the rider taps the upload button. */}
            {pickerFor ? (
                <View style={styles.pickerBackdrop}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={() => setPickerFor(null)} />
                    <View style={styles.pickerCard}>
                        <Text style={styles.pickerTitle}>Upload {pickerFor.name}</Text>
                        <Text style={styles.pickerSub}>Choose a source. Files stay on our servers only.</Text>
                        <View style={styles.pickerRow}>
                            <Pressable style={styles.pickerBtn} onPress={() => { const p = pickerFor; setPickerFor(null); if (p) doUpload(p.kind, p.name, 'camera'); }}>
                                <ImagePlus size={18} color={colors.foreground} />
                                <Text style={styles.pickerBtnText}>Camera</Text>
                            </Pressable>
                            <Pressable style={styles.pickerBtn} onPress={() => { const p = pickerFor; setPickerFor(null); if (p) doUpload(p.kind, p.name, 'gallery'); }}>
                                <ImagePlus size={18} color={colors.foreground} />
                                <Text style={styles.pickerBtnText}>Gallery</Text>
                            </Pressable>
                            <Pressable style={styles.pickerBtn} onPress={() => { const p = pickerFor; setPickerFor(null); if (p) doUpload(p.kind, p.name, 'file'); }}>
                                <FileText size={18} color={colors.foreground} />
                                <Text style={styles.pickerBtnText}>Files / PDF</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            ) : null}

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
    thumb: { width: 42, height: 42, borderRadius: radius.sm, backgroundColor: colors.chipBg, borderWidth: 1, borderColor: colors.border },
    thumbFile: { alignItems: 'center', justifyContent: 'center' },
    thumbFileText: { fontSize: 10, fontFamily: fonts.bodyBold, color: colors.mutedForeground, letterSpacing: 0.5 },
    name: { fontSize: 14, fontFamily: fonts.bodyBold, color: colors.foreground },
    sub: { fontSize: 11, fontFamily: fonts.body, color: colors.mutedForeground, marginTop: 2 },
    pill: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
    pillText: { fontSize: 10, fontFamily: fonts.bodyBold, letterSpacing: 0.4, textTransform: 'uppercase' },
    uploadBtn: { width: 32, height: 32, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },

    pickerBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
    pickerCard: { backgroundColor: colors.card, padding: 16, borderTopWidth: 1, borderTopColor: colors.border, gap: 10 },
    pickerTitle: { fontSize: 15, fontFamily: fonts.displayBold, color: colors.foreground },
    pickerSub: { fontSize: 12, fontFamily: fonts.body, color: colors.mutedForeground },
    pickerRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
    pickerBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 6, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, borderRadius: radius.sm },
    pickerBtnText: { fontSize: 12, fontFamily: fonts.bodyBold, color: colors.foreground },
});
