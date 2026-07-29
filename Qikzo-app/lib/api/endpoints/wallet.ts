import { http } from '../client';

export type WalletKind = 'money' | 'loyalty';

export type WalletSummary = {
    money: { balance: number; currency: string; totalSpent: number };
    loyalty: { balance: number; currency: string; totalEarned: number; maxUsagePct: number };
};

export type WalletTxn = {
    id: string;
    type: 'topup' | 'refund' | 'trip_debit' | 'trip_credit' | 'payout_debit' | 'adjustment' | 'bonus' | 'penalty';
    direction: 'credit' | 'debit';
    amount: number;
    balanceAfter: number;
    note?: string;
    booking?: string | null;
    createdAt: string;
};

export const walletApi = {
    async summary(): Promise<WalletSummary> {
        const r = await http.get<WalletSummary>('/wallet/summary');
        return { money: r.money, loyalty: r.loyalty };
    },
    async transactions(kind: WalletKind = 'money', limit = 25): Promise<WalletTxn[]> {
        const r = await http.get<{ items: WalletTxn[] }>('/wallet/transactions', { query: { kind, limit } });
        return r.items;
    },
    async topup(amount: number, method: 'upi' | 'card' | 'netbanking' = 'upi'): Promise<{ balance: number; txn: WalletTxn | null }> {
        const r = await http.post<{ balance: number; txn: WalletTxn | null }>('/wallet/topup', { amount, method });
        return { balance: r.balance, txn: r.txn };
    },
};

export default walletApi;
