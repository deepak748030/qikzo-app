import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { FileCheck2, Upload } from 'lucide-react-native';
import { colors, fonts, radius } from '@/lib/theme';
import ScreenHeader from '@/components/ScreenHeader';
import BottomSheet from '@/components/BottomSheet';
import { useSheet } from '@/lib/useSheet';
import { documents } from '@/lib/mockData';

const STATUS_COLOR = {
    verified: colors.success,
    pending: colors.warning,
    rejected: colors.danger,
} as const;

export default function Documents() {
    const sheet = useSheet();
    const upload = (name: string) => sheet.show({
        variant: 'info',
        title: `Upload ${name}`,
        message: 'Document upload will be available once you connect your camera and file library.',
    });

    return (
        <View style={styles.container}>
            <ScreenHeader title="Documents" />
            <ScrollView contentContainerStyle={{ padding: 6, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
                <Text style={styles.lead}>
                    Keep your documents up to date to stay eligible for jobs. All uploads are verified within 24 hours.
                </Text>

                <View style={styles.list}>
                    {documents.map((d) => (
                        <View key={d.id} style={styles.row}>
                            <View style={styles.iconWrap}>
                                <FileCheck2 size={18} color={colors.primary} strokeWidth={2} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.name}>{d.name}</Text>
                                <Text style={styles.sub}>{d.updatedAt}</Text>
                            </View>
                            <View style={[styles.pill, { borderColor: STATUS_COLOR[d.status] }]}>
                                <Text style={[styles.pillText, { color: STATUS_COLOR[d.status] }]}>{d.status}</Text>
                            </View>
                            <Pressable style={styles.uploadBtn} onPress={() => upload(d.name)} hitSlop={6}>
                                <Upload size={16} color={colors.foreground} />
                            </Pressable>
                        </View>
                    ))}
                </View>
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
