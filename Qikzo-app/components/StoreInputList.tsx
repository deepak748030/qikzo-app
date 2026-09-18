import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { UtensilsCrossed, Store as StoreIcon } from 'lucide-react-native';
import { colors, fonts, radius } from '@/lib/theme';
import Input from '@/components/Input';
import { useBannerFlow } from '@/lib/bannerFlowStore';
import type { BannerStore } from '@/lib/api/endpoints/categoryBanners';

/**
 * One input box per applicable merchant.
 *
 * Every merchant's text is stored under its own key in `bannerFlowStore`, so
 * they are never combined into a single field — the customer can order from
 * three restaurants and each note stays attached to its own store.
 */
export default function StoreInputList({ stores }: { stores: BannerStore[] }) {
    const storeInputs = useBannerFlow((s) => s.storeInputs);
    const setStoreNote = useBannerFlow((s) => s.setStoreNote);

    if (!stores.length) return null;

    return (
        <View style={styles.wrap}>
            {stores.map((s) => (
                <View key={s._id} style={styles.row}>
                    <View style={styles.head}>
                        <View style={styles.iconWrap}>
                            {s.kind === 'store'
                                ? <StoreIcon size={14} color={colors.primary} strokeWidth={2} />
                                : <UtensilsCrossed size={14} color={colors.primary} strokeWidth={2} />}
                        </View>
                        <Text style={styles.name} numberOfLines={1}>{s.name}</Text>
                    </View>
                    <Input
                        value={storeInputs[s._id]?.note || ''}
                        onChangeText={(v) => setStoreNote(s._id, s.name, v)}
                        placeholder={`What should we pick up from ${s.name}?`}
                        multiline
                        numberOfLines={3}
                        maxLength={300}
                        style={{ minHeight: 64, textAlignVertical: 'top' }}
                    />
                </View>
            ))}
            <Text style={styles.hint}>
                Fill in at least one. Each store's note is sent to the rider separately.
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { gap: 10 },
    row: { gap: 6 },
    head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    iconWrap: {
        width: 24, height: 24, borderRadius: radius.sm,
        backgroundColor: colors.chipBg, alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: colors.border,
    },
    name: { fontSize: 13, fontFamily: fonts.displayBold, color: colors.foreground, flex: 1 },
    hint: { fontSize: 11, fontFamily: fonts.body, color: colors.mutedForeground, marginTop: 2 },
});
