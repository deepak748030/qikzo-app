import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Image, Share, TextInput } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Copy, Share2, Gift, CheckCircle2, Users, Trophy } from 'lucide-react-native';
import { colors, fonts, radius } from '@/lib/theme';
import ScreenHeader from '@/components/ScreenHeader';
import BottomSheet from '@/components/BottomSheet';
import { useSheet } from '@/lib/useSheet';
import { referralApi, type ReferralInfo } from '@/lib/api/endpoints/referrals';
import { ApiError } from '@/lib/api/errors';

const referHero = require('../assets/images/refer-earn.png');

/**
 * Refer & Earn — invite friends, earn wallet rewards as they complete
 * deliveries. Every number here (milestones, rewards, wallet target) comes
 * from the server's admin-tunable reward config.
 */
export default function ReferEarnScreen() {
    const insets = useSafeAreaInsets();
    const sheet = useSheet();
    const [info, setInfo] = useState<ReferralInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [code, setCode] = useState('');
    const [applying, setApplying] = useState(false);

    const load = async () => {
        try {
            setInfo(await referralApi.me());
        } catch (e) {
            const msg = e instanceof ApiError ? e.message : 'Could not load referrals.';
            sheet.show({ variant: 'error', title: 'Refer & earn', message: msg });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

    const shareText = useMemo(() => {
        if (!info) return '';
        const top = info.milestones.length ? info.milestones[info.milestones.length - 1] : null;
        return `Use my Qikzo code ${info.code} to join Qikzo as a delivery partner.${top ? ` I earn up to ₹${top.reward} as you complete deliveries!` : ''}`;
    }, [info]);

    const copyCode = async () => {
        if (!info?.code) return;
        await Clipboard.setStringAsync(info.code);
        sheet.show({ variant: 'success', title: 'Code copied', message: `${info.code} is on your clipboard.` });
    };

    const doShare = async () => {
        if (!shareText) return;
        try { await Share.share({ message: shareText }); } catch { /* user dismissed */ }
    };

    const applyCode = async () => {
        const c = code.trim().toUpperCase();
        if (c.length < 4) {
            sheet.show({ variant: 'error', title: 'Invalid code', message: 'Enter the code your friend shared.' });
            return;
        }
        setApplying(true);
        try {
            const r = await referralApi.apply(c);
            setCode('');
            sheet.show({
                variant: 'success',
                title: 'Code applied',
                message: 'You are now linked to your friend.',
            });
            await load();
        } catch (e) {
            const msg = e instanceof ApiError ? e.message : 'Could not apply code.';
            sheet.show({ variant: 'error', title: 'Code not applied', message: msg });
        } finally {
            setApplying(false);
        }
    };

    return (
        <View style={styles.container}>
            <ScreenHeader title="Refer & earn" />
            {loading ? (
                <View style={{ padding: 32 }}><ActivityIndicator color={colors.primary} /></View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
                    {/* Hero */}
                    <View style={styles.hero}>
                        <Image source={referHero} style={styles.heroImg} resizeMode="contain" />
                        <Text style={styles.heroTitle}>Invite friends. Earn real rewards.</Text>
                        <Text style={styles.heroSub}>
                            Share your code — you get paid into your wallet as your friends complete deliveries.
                        </Text>
                    </View>

                    {/* Code card */}
                    <View style={styles.codeCard}>
                        <Text style={styles.sectionLabel}>Your referral code</Text>
                        <View style={styles.codeRow}>
                            <Text style={styles.code}>{info?.code ?? '—'}</Text>
                            <Pressable style={styles.iconBtn} onPress={copyCode} hitSlop={8}>
                                <Copy size={16} color={colors.primary} />
                            </Pressable>
                        </View>
                        <Pressable style={styles.shareBtn} onPress={doShare}>
                            <Share2 size={16} color="#FFFFFF" />
                            <Text style={styles.shareText}>Share invite</Text>
                        </Pressable>
                    </View>

                    {/* Stats */}
                    <View style={styles.statsRow}>
                        <View style={styles.stat}>
                            <Users size={14} color={colors.mutedForeground} />
                            <Text style={styles.statValue}>{info?.totalInvites ?? 0}</Text>
                            <Text style={styles.statLabel}>Friends joined</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.stat}>
                            <Gift size={14} color={colors.mutedForeground} />
                            <Text style={styles.statValue}>₹{info?.totalEarned ?? 0}</Text>
                            <Text style={styles.statLabel}>Total earned</Text>
                        </View>
                    </View>

                    {/* Milestones */}
                    <Text style={styles.sectionLabelOuter}>Reward milestones</Text>
                    <View style={styles.card}>
                        {(info?.milestones ?? []).length === 0 ? (
                            <Text style={styles.emptyText}>No reward milestones are live right now.</Text>
                        ) : (
                            info!.milestones.map((m, i) => (
                                <View key={`${m.deliveries}-${i}`} style={[styles.msRow, i === info!.milestones.length - 1 && { borderBottomWidth: 0 }]}>
                                    <View style={styles.msIcon}><Trophy size={14} color={colors.primaryForeground} /></View>
                                    <Text style={styles.msText}>
                                        Friend completes {m.deliveries} {m.deliveries === 1 ? 'delivery' : 'deliveries'}
                                    </Text>
                                    <Text style={styles.msReward}>₹{m.reward}</Text>
                                </View>
                            ))
                        )}
                        <Text style={styles.note}>
                            Rewards are credited in ₹ directly to your money wallet.
                            {info?.terms ? ` ${info.terms}` : ''}
                        </Text>
                    </View>

                    {/* Invites */}
                    <Text style={styles.sectionLabelOuter}>Your invites</Text>
                    <View style={styles.card}>
                        {(info?.invites ?? []).length === 0 ? (
                            <Text style={styles.emptyText}>No one has joined with your code yet.</Text>
                        ) : (
                            info!.invites.map((iv, i) => (
                                <View key={iv.id} style={[styles.inviteRow, i === info!.invites.length - 1 && { borderBottomWidth: 0 }]}>
                                    <View style={styles.avatar}><Text style={styles.avatarText}>{(iv.name || 'U').charAt(0).toUpperCase()}</Text></View>
                                    <View style={{ flex: 1, minWidth: 0 }}>
                                        <Text style={styles.inviteName} numberOfLines={1}>{iv.name || 'Qikzo user'}</Text>
                                        <Text style={styles.inviteMeta} numberOfLines={1}>
                                            {iv.deliveries} deliveries
                                            {iv.nextMilestone ? ` • ₹${iv.nextMilestone.reward} at ${iv.nextMilestone.deliveries}` : ' • all rewards unlocked'}
                                        </Text>
                                    </View>
                                    <Text style={styles.inviteEarned}>₹{iv.earned}</Text>
                                </View>
                            ))
                        )}
                    </View>

                    {/* Apply a friend's code */}
                    {info?.canApplyCode ? (
                        <>
                            <Text style={styles.sectionLabelOuter}>Have a friend's code?</Text>
                            <View style={styles.card}>
                                <View style={styles.applyRow}>
                                    <TextInput
                                        value={code}
                                        onChangeText={(v) => setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                                        placeholder="ENTER CODE"
                                        placeholderTextColor={colors.mutedForeground}
                                        autoCapitalize="characters"
                                        maxLength={12}
                                        style={styles.applyInput}
                                    />
                                    <Pressable
                                        style={[styles.applyBtn, (applying || !code) && { opacity: 0.6 }]}
                                        onPress={applyCode}
                                        disabled={applying || !code}
                                    >
                                        {applying ? <ActivityIndicator size="small" color="#FFFFFF" /> : (
                                            <>
                                                <CheckCircle2 size={14} color="#FFFFFF" />
                                                <Text style={styles.applyText}>Apply</Text>
                                            </>
                                        )}
                                    </Pressable>
                                </View>
                                <Text style={styles.note}>Link your account to the partner who invited you.</Text>
                            </View>
                        </>
                    ) : null}
                </ScrollView>
            )}
            <BottomSheet visible={sheet.visible} {...sheet.config} onClose={sheet.hide} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    hero: { alignItems: 'center', paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4 },
    heroImg: { width: '100%', height: 180 },
    heroTitle: { fontSize: 20, fontFamily: fonts.displayBold, color: colors.foreground, textAlign: 'center', marginTop: 4 },
    heroSub: { fontSize: 12, fontFamily: fonts.body, color: colors.mutedForeground, textAlign: 'center', marginTop: 6, lineHeight: 18 },

    codeCard: {
        marginTop: 12, marginHorizontal: 6, padding: 12, gap: 8,
        borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.card,
    },
    sectionLabel: { fontSize: 11, fontFamily: fonts.bodyBold, color: colors.mutedForeground, letterSpacing: 0.4, textTransform: 'uppercase' },
    sectionLabelOuter: { fontSize: 11, fontFamily: fonts.bodyBold, color: colors.mutedForeground, letterSpacing: 0.4, textTransform: 'uppercase', marginHorizontal: 12, marginTop: 14, marginBottom: 6 },
    codeRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary, borderRadius: radius.md,
        paddingHorizontal: 12, paddingVertical: 12, backgroundColor: colors.chipBg,
    },
    code: { fontSize: 20, fontFamily: fonts.displayBold, color: colors.primary, letterSpacing: 2 },
    iconBtn: { padding: 6 },
    shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 12 },
    shareText: { color: '#FFFFFF', fontFamily: fonts.bodyBold, fontSize: 14 },

    statsRow: {
        flexDirection: 'row', marginTop: 10, marginHorizontal: 6,
        borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.card, overflow: 'hidden',
    },
    stat: { flex: 1, alignItems: 'center', paddingVertical: 12, gap: 3 },
    statDivider: { width: 1, backgroundColor: colors.border },
    statValue: { fontSize: 18, fontFamily: fonts.displayBold, color: colors.foreground },
    statLabel: { fontSize: 10, fontFamily: fonts.body, color: colors.mutedForeground },

    card: { marginHorizontal: 6, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.card, overflow: 'hidden' },
    msRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderBottomWidth: 1, borderBottomColor: colors.divider },
    msIcon: { width: 28, height: 28, borderRadius: radius.pill, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    msText: { flex: 1, fontSize: 13, fontFamily: fonts.body, color: colors.foreground },
    msReward: { fontSize: 15, fontFamily: fonts.displayBold, color: colors.success },
    note: { fontSize: 11, fontFamily: fonts.body, color: colors.mutedForeground, padding: 12, paddingTop: 10, lineHeight: 16 },

    inviteRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderBottomWidth: 1, borderBottomColor: colors.divider },
    avatar: { width: 32, height: 32, borderRadius: radius.pill, backgroundColor: colors.chipBg, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 13, fontFamily: fonts.displayBold, color: colors.primary },
    inviteName: { fontSize: 13, fontFamily: fonts.bodyBold, color: colors.foreground },
    inviteMeta: { fontSize: 10, fontFamily: fonts.body, color: colors.mutedForeground, marginTop: 2 },
    inviteEarned: { fontSize: 14, fontFamily: fonts.displayBold, color: colors.success },

    applyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 12, paddingBottom: 0 },
    applyInput: {
        flex: 1, borderWidth: 1, borderColor: colors.inputBorder, backgroundColor: colors.inputBg,
        borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10,
        fontFamily: fonts.bodyBold, fontSize: 14, color: colors.foreground, letterSpacing: 1.5,
    },
    applyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 12 },
    applyText: { color: '#FFFFFF', fontFamily: fonts.bodyBold, fontSize: 13 },

    emptyText: { textAlign: 'center', color: colors.mutedForeground, padding: 20, fontFamily: fonts.body, fontSize: 12 },
});
