import { http } from '../client';

/** Public wallet names. `loyalty` is the legacy alias for `bonus`. */
export type WalletKind = 'money' | 'bonus';

export type BonusTier = { minAmount: number; type: 'percent' | 'flat'; value: number; maxBonus: number };

export type WalletSummary = {
    money: { balance: number; currency: string; totalSpent: number; totalEarned?: number };
    bonus: { balance: number; currency: string; totalEarned: number; totalSpent?: number; maxUsagePct: number };
    config: {
        bonusEnabled: boolean;
        maxUsagePct: number;
        minTopup: number;
        maxTopup: number;
        tiers: BonusTier[];
    };
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

export type TopupQuote = {
    amount: number;
    bonus: number;
    total: number;
    valid: boolean;
    minTopup: number;
    maxTopup: number;
    tiers: BonusTier[];
};

export type PayQuote = {
    amount: number;
    fromBonus: number;
    fromMoney: number;
    maxUsagePct: number;
    moneyBalance: number;
    bonusBalance: number;
    canPay: boolean;
    shortfall: number;
};

export type TopupResult = {
    balance: number;
    bonusEarned: number;
    bonusBalance: number;
    credited: number;
    txn: WalletTxn | null;
};

export const walletApi = {
    async summary(): Promise<WalletSummary> {
        const r = await http.get<any>('/wallet/summary');
        return {
            money: r.money,
            // Server sends both `bonus` and the legacy `loyalty` alias.
            bonus: r.bonus ?? r.loyalty,
            config: r.config,
        };
    },
    async transactions(kind: WalletKind = 'money', limit = 25): Promise<WalletTxn[]> {
        const r = await http.get<{ items: WalletTxn[] }>('/wallet/transactions', { query: { kind, limit } });
        return r.items;
    },
    async topupQuote(amount: number): Promise<TopupQuote> {
        return http.get<TopupQuote>('/wallet/topup-quote', { query: { amount } });
    },
    async topup(amount: number, method: 'upi' | 'card' | 'netbanking' = 'upi'): Promise<TopupResult> {
        const r = await http.post<TopupResult>('/wallet/topup', { amount, method });
        return {
            balance: r.balance,
            bonusEarned: r.bonusEarned ?? 0,
            bonusBalance: r.bonusBalance ?? 0,
            credited: r.credited ?? amount,
            txn: r.txn ?? null,
        };
    },
    async payQuote(amount: number): Promise<PayQuote> {
        return http.get<PayQuote>('/wallet/pay-quote', { query: { amount } });
    },
    async pay(bookingId: string) {
        return http.post<{ alreadyPaid: boolean; paid?: number; fromMoney?: number; fromBonus?: number }>(
            '/wallet/pay',
            { bookingId }
        );
    },
};

export default walletApi;
