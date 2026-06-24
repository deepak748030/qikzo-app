import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { Mail, Phone, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react-native';
import ScreenHeader from '@/components/ScreenHeader';
import BottomSheet from '@/components/BottomSheet';
import { colors } from '@/lib/theme';

const FAQS = [
    { q: 'How do I withdraw my earnings?', a: 'Go to Wallet → Withdraw, choose UPI/Bank, enter amount and submit.' },
    { q: 'How long does KYC take?', a: 'KYC is usually verified within 24 hours.' },
    { q: 'When do I get referral rewards?', a: 'Reward is credited once your friend completes their first task.' },
    { q: 'Why was my task rejected?', a: 'Tasks may be rejected if instructions are not followed correctly.' },
];

export default function HelpSupportScreen() {
    const [openIdx, setOpenIdx] = useState<number | null>(0);
    const [msg, setMsg] = useState('');
    const [loading, setLoading] = useState(false);
    const [sheet, setSheet] = useState(false);

    const onSend = () => {
        if (!msg.trim()) return;
        setLoading(true);
        setTimeout(() => { setLoading(false); setMsg(''); setSheet(true); }, 800);
    };

    return (
        <View style={styles.container}>
            <ScreenHeader title="Help & Support" />
            <FlatList
                data={FAQS}
                keyExtractor={(_, i) => String(i)}
                contentContainerStyle={{ paddingHorizontal: 6, paddingBottom: 24 }}
                ItemSeparatorComponent={() => <View style={styles.sep} />}
                ListHeaderComponent={
                    <View>
                        <View style={styles.contactRow}>
                            <View style={styles.contactCard}>
                                <View style={[styles.contactIcon, { backgroundColor: '#DBEAFE' }]}>
                                    <Mail size={16} color={colors.primary} />
                                </View>
                                <Text style={styles.contactLabel}>Email</Text>
                            </View>
                            <View style={styles.contactCard}>
                                <View style={[styles.contactIcon, { backgroundColor: '#DCFCE7' }]}>
                                    <Phone size={16} color={colors.success} />
                                </View>
                                <Text style={styles.contactLabel}>Call</Text>
                            </View>
                            <View style={styles.contactCard}>
                                <View style={[styles.contactIcon, { backgroundColor: '#FEF3C7' }]}>
                                    <MessageCircle size={16} color={colors.warning} />
                                </View>
                                <Text style={styles.contactLabel}>Chat</Text>
                            </View>
                        </View>
                        <Text style={styles.sectionTitle}>Frequently Asked</Text>
                    </View>
                }
                renderItem={({ item, index }) => {
                    const open = openIdx === index;
                    return (
                        <Pressable style={styles.faq} onPress={() => setOpenIdx(open ? null : index)}>
                            <View style={styles.faqHead}>
                                <Text style={styles.faqQ}>{item.q}</Text>
                                {open ? <ChevronUp size={16} color={colors.mutedForeground} /> : <ChevronDown size={16} color={colors.mutedForeground} />}
                            </View>
                            {open && <Text style={styles.faqA}>{item.a}</Text>}
                        </Pressable>
                    );
                }}
                ListFooterComponent={
                    <View>
                        <Text style={styles.sectionTitle}>Send us a message</Text>
                        <View style={styles.msgWrap}>
                            <TextInput
                                value={msg} onChangeText={setMsg} multiline placeholder="Type your message..."
                                placeholderTextColor={colors.mutedForeground} style={styles.msgInput}
                            />
                        </View>
                        <Pressable style={styles.sendBtn} onPress={onSend} disabled={loading}>
                            {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.sendText}>Send Message</Text>}
                        </Pressable>
                    </View>
                }
            />

            <BottomSheet
                visible={sheet} variant="success"
                title="Message Sent" message="Our team will get back to you soon."
                confirmText="Done" onClose={() => setSheet(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    contactRow: { flexDirection: 'row', gap: 4, marginTop: 6 },
    contactCard: {
        flex: 1, alignItems: 'center', backgroundColor: colors.card, paddingVertical: 10,
        borderRadius: 6, borderWidth: 1, borderColor: colors.border,
    },
    contactIcon: { width: 36, height: 36, borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    contactLabel: { color: colors.foreground, fontSize: 11, fontWeight: '600' },
    sectionTitle: { color: colors.foreground, fontWeight: '700', fontSize: 14, marginTop: 10, marginBottom: 4 },
    faq: {
        backgroundColor: colors.card,
        paddingHorizontal: 10, paddingVertical: 10,
    },
    sep: { height: 1, backgroundColor: colors.border },
    faqHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    faqQ: { color: colors.foreground, fontWeight: '600', fontSize: 13, flex: 1, marginRight: 6 },
    faqA: { color: colors.mutedForeground, fontSize: 12, marginTop: 6, lineHeight: 18 },
    msgWrap: {
        backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.inputBorder,
        borderRadius: 6, paddingHorizontal: 10,
    },
    msgInput: { color: colors.foreground, fontSize: 13, minHeight: 90, paddingVertical: 8, textAlignVertical: 'top' },
    sendBtn: {
        backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 6,
        alignItems: 'center', justifyContent: 'center', marginTop: 6,
    },
    sendText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
