import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Wallet as WalletIcon, Gift, ArrowDownLeft, ArrowUpRight, Plus } from 'lucide-react-native';
import { colors, fonts, radius } from '@/lib/theme';
import ScreenHeader from '@/components/ScreenHeader';
import BottomSheet from '@/components/BottomSheet';
import { useSheet } from '@/lib/useSheet';
import { walletApi, type WalletSummary, type WalletTxn, type WalletKind } from '@/lib/api/endpoints/wallet';
import { ApiError } from '@/lib/api/errors';

/**
 * Wallet screen — one page with two balances (Money + Loyalty). Tabs switch
 * the transaction history and the top-up button only applies to Money.
 */
export default function WalletScreen() {
    const insets = useSafeAreaInsets();
    const sheet = useSheet();
    const [tab, setTab] = useState<WalletKind>('money');
    const [summary, setSummary] = useState<WalletSummary | null>(null);
    const [txns, setTxns] = useState<WalletTxn[]>([]);
    const [loading, setLoading] = useState(true);
    const [topupAmount, setTopupAmount] = useState('');
    const [toppingUp, setToppingUp] = useState(false);

    const refresh = async (kind: WalletKind = tab) => {
        try {
            const [s, t] = await Promise.all([walletApi.summary(), walletApi.transactions(kind, 50)]);
            setSummary(s);
            setTxns(t);
        } catch (e) {
            const msg = e instanceof ApiError ? e.message : 'Could not load wallet.';
            sheet.show({ variant: 'error', title: 'Wallet error', message: msg });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { setLoading(true); refresh(tab); /* eslint-disable-next-line */ }, [tab]);

    const quickAmounts = [100, 200, 500, 1000];

    const doTopup = async (amt: number) => {
        if (!Number.isFinite(amt) || amt < 10) {
            sheet.show({ variant: 'error', title: 'Enter amount', message: 'Minimum topup is ₹10.' });
            return;
        }
        setToppingUp(true);
        try {
            await walletApi.topup(amt, 'upi');
            setTopupAmount('');
            sheet.show({ variant: 'success', title: 'Wallet topped up', message: `₹${amt} added to your wallet.` });
            await refresh('money');
        } catch (e) {
            const msg = e instanceof ApiError ? e.message : 'Topup failed.';
            sheet.show({ variant: 'error', title: 'Topup failed', message: msg });
        } finally {
            setToppingUp(false);
        }
    };

    const activeBalance = tab === 'money' ? summary?.money.balance ?? 0 : summary?.loyalty.balance ?? 0;

    return (
        <View style={styles.container}>
            <ScreenHeader title="Wallet" />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
                {/* Two-in-one balance card: Money + Loyalty side by side, zero gap. */}
                <View style={styles.balanceCard}>
                    <Pressable style={[styles.balHalf, tab === 'money' && styles.balHalfActive]} onPress={() => setTab('money')}>
                        <View style={styles.balHead}>
                            <WalletIcon size={14} color={tab === 'money' ? '#FFFFFF' : colors.mutedForeground} />
                            <Text style={[styles.balLabel, tab === 'money' && styles.balLabelActive]}>Money</Text>
                        </View>
                        <Text style={[styles.balAmount, tab === 'money' && styles.balAmountActive]}>₹{summary?.money.balance?.toFixed(0) ?? '0'}</Text>
                        <Text style={[styles.balMeta, tab === 'money' && styles.balMetaActive]}>Spent ₹{summary?.money.totalSpent?.toFixed(0) ?? '0'}</Text>
                    </Pressable>
                    <View style={styles.balDivider} />
                    <Pressable style={[styles.balHalf, tab === 'loyalty' && styles.balHalfActive]} onPress={() => setTab('loyalty')}>
                        <View style={styles.balHead}>
                            <Gift size={14} color={tab === 'loyalty' ? '#FFFFFF' : colors.mutedForeground} />
                            <Text style={[styles.balLabel, tab === 'loyalty' && styles.balLabelActive]}>Loyalty</Text>
                        </View>
                        <Text style={[styles.balAmount, tab === 'loyalty' && styles.balAmountActive]}>₹{summary?.loyalty.balance?.toFixed(0) ?? '0'}</Text>
                        <Text style={[styles.balMeta, tab === 'loyalty' && styles.balMetaActive]}>
                            Up to {summary?.loyalty.maxUsagePct ?? 20}% per bill
                        </Text>
                    </Pressable>
                </View>

                {/* Money-only add-money panel */}
                {tab === 'money' ? (
                    <View style={styles.topupCard}>
                        <Text style={styles.sectionLabel}>Add money</Text>
                        <View style={styles.quickRow}>
                            {quickAmounts.map((a) => (
                                <Pressable key={a} style={styles.quickChip} onPress={() => setTopupAmount(String(a))}>
                                    <Text style={styles.quickText}>₹{a}</Text>
                                </Pressable>
                            ))}
                        </View>
                        <View style={styles.amountRow}>
                            <Text style={styles.rupee}>₹</Text>
                            <TextInput
                                value={topupAmount}
                                onChangeText={(v) => setTopupAmount(v.replace(/[^0-9]/g, ''))}
                                keyboardType="number-pad"
                                placeholder="Enter amount"
                                placeholderTextColor={colors.mutedForeground}
                                style={styles.amountInput}
                                maxLength={6}
                            />
                            <Pressable
                                style={[styles.addBtn, (!topupAmount || toppingUp) && { opacity: 0.6 }]}
                                onPress={() => doTopup(Number(topupAmount))}
                                disabled={!topupAmount || toppingUp}
                            >
                                {toppingUp ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <>
                                        <Plus size={14} color="#FFFFFF" />
                                        <Text style={styles.addBtnText}>Add</Text>
                                    </>
                                )}
                            </Pressable>
                        </View>
                    </View>
                ) : (
                    <View style={styles.loyaltyNote}>
                        <Text style={styles.loyaltyNoteText}>
                            Loyalty balance is earned as bonus. You can use up to
                            {' '}{summary?.loyalty.maxUsagePct ?? 20}% of any bill from this balance.
                        </Text>
                    </View>
                )}

                {/* Transaction history */}
                <Text style={styles.sectionLabelOuter}>Transaction history</Text>
                {loading ? (
                    <View style={{ padding: 24 }}><ActivityIndicator color={colors.foreground} /></View>
                ) : txns.length === 0 ? (
                    <Text style={styles.emptyText}>No transactions yet.</Text>
                ) : (
                    <View style={styles.txnList}>
                        {txns.map((t) => (
                            <View key={t.id} style={styles.txnRow}>
                                <View style={[styles.txnIcon, t.direction === 'credit' ? styles.txnIconCredit : styles.txnIconDebit]}>
                                    {t.direction === 'credit' ? (
                                        <ArrowDownLeft size={16} color="#FFFFFF" />
                                    ) : (
                                        <ArrowUpRight size={16} color="#FFFFFF" />
                                    )}
                                </View>
                                <View style={{ flex: 1, minWidth: 0 }}>
                                    <Text style={styles.txnTitle} numberOfLines={1}>{prettyType(t.type)}</Text>
                                    <Text style={styles.txnMeta} numberOfLines={1}>
                                        {new Date(t.createdAt).toLocaleString()}
                                    </Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={[styles.txnAmount, t.direction === 'credit' ? { color: colors.success } : { color: colors.danger }]}>
                                        {t.direction === 'credit' ? '+' : '-'}₹{t.amount}
                                    </Text>
                                    <Text style={styles.txnBal}>Bal ₹{t.balanceAfter}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>

            <BottomSheet visible={sheet.visible} {...sheet.config} onClose={sheet.hide} />
        </View>
    );
}

function prettyType(t: WalletTxn['type']) {
    switch (t) {
        case 'topup': return 'Wallet topup';
        case 'refund': return 'Refund';
        case 'trip_debit': return 'Trip payment';
        case 'trip_credit': return 'Trip earnings';
        case 'bonus': return 'Loyalty bonus';
        case 'penalty': return 'Penalty';
        case 'adjustment': return 'Adjustment';
        case 'payout_debit': return 'Payout';
        default: return t;
    }
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    // Zero gap between the two balance halves per spec.
    balanceCard: {
        marginTop: 0, marginHorizontal: 6,
        flexDirection: 'row', borderRadius: radius.lg, overflow: 'hidden',
        borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card,
    },
    balHalf: { flex: 1, padding: 12, gap: 4 },
    balHalfActive: { backgroundColor: colors.primary },
    balDivider: { width: 1, backgroundColor: colors.border },
    balHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    balLabel: { fontSize: 11, fontFamily: fonts.bodyBold, color: colors.mutedForeground, letterSpacing: 0.4, textTransform: 'uppercase' },
    balLabelActive: { color: 'rgba(255,255,255,0.9)' },
    balAmount: { fontSize: 22, fontFamily: fonts.displayBold, color: colors.foreground },
    balAmountActive: { color: '#FFFFFF' },
    balMeta: { fontSize: 10, fontFamily: fonts.body, color: colors.mutedForeground },
    balMetaActive: { color: 'rgba(255,255,255,0.85)' },

    sectionLabel: { fontSize: 11, fontFamily: fonts.bodyBold, color: colors.mutedForeground, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 6 },
    sectionLabelOuter: { fontSize: 11, fontFamily: fonts.bodyBold, color: colors.mutedForeground, letterSpacing: 0.4, textTransform: 'uppercase', marginHorizontal: 12, marginTop: 14, marginBottom: 6 },

    topupCard: {
        marginTop: 10, marginHorizontal: 6, padding: 12,
        borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.card,
    },
    quickRow: { flexDirection: 'row', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
    quickChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
    quickText: { fontSize: 12, fontFamily: fonts.bodyBold, color: colors.foreground },
    amountRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    rupee: { fontSize: 16, fontFamily: fonts.displayBold, color: colors.foreground, paddingHorizontal: 4 },
    amountInput: {
        flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
        paddingHorizontal: 10, paddingVertical: 10, fontSize: 14, color: colors.foreground, fontFamily: fonts.bodyBold,
        backgroundColor: colors.background,
    },
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.md, backgroundColor: colors.primary },
    addBtnText: { fontSize: 13, color: '#FFFFFF', fontFamily: fonts.bodyBold },

    loyaltyNote: {
        marginTop: 10, marginHorizontal: 6, padding: 12,
        borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.card,
    },
    loyaltyNoteText: { fontSize: 12, color: colors.mutedForeground, fontFamily: fonts.body, lineHeight: 18 },

    txnList: { marginHorizontal: 6, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.card, overflow: 'hidden' },
    txnRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderBottomWidth: 1, borderBottomColor: colors.divider },
    txnIcon: { width: 32, height: 32, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
    txnIconCredit: { backgroundColor: colors.success },
    txnIconDebit: { backgroundColor: colors.danger },
    txnTitle: { fontSize: 13, fontFamily: fonts.bodyBold, color: colors.foreground },
    txnMeta: { fontSize: 10, fontFamily: fonts.body, color: colors.mutedForeground, marginTop: 2 },
    txnAmount: { fontSize: 14, fontFamily: fonts.displayBold },
    txnBal: { fontSize: 10, fontFamily: fonts.body, color: colors.mutedForeground, marginTop: 2 },
    emptyText: { textAlign: 'center', color: colors.mutedForeground, padding: 24, fontFamily: fonts.body },
});
