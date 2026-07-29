import Wallet from '../models/Wallet';
import WalletTransaction, { type TxnType } from '../models/WalletTransaction';
import Payment from '../models/Payment';
import { errors } from '../lib/errors';

/**
 * Wallet service.
 *
 * Two wallets per user:
 *   - `customer` — real money (topups, refunds, trip debits).
 *   - `loyalty`  — bonus balance, usage capped at LOYALTY_MAX_USAGE_PCT of a bill.
 *
 * All balance changes go through `postTxn` so `Wallet.balance` and the ledger
 * stay in sync. Never mutate `balance` directly.
 */

export const LOYALTY_MAX_USAGE_PCT = 20;

async function getOrCreate(userId: string, kind: 'customer' | 'loyalty') {
    let w = await Wallet.findOne({ owner: userId, kind });
    if (!w) w = await Wallet.create({ owner: userId, kind });
    return w;
}

async function postTxn(params: {
    userId: string;
    kind: 'customer' | 'loyalty';
    type: TxnType;
    direction: 'credit' | 'debit';
    amount: number;
    note?: string;
    refCode?: string;
    booking?: string | null;
    payment?: string | null;
}) {
    const { userId, kind, type, direction, amount } = params;
    if (!Number.isFinite(amount) || amount <= 0) throw errors.badRequest('Invalid amount', 'BAD_AMOUNT');
    const w = await getOrCreate(userId, kind);
    if (direction === 'debit' && w.balance < amount) {
        throw errors.badRequest('Insufficient wallet balance', 'INSUFFICIENT_FUNDS');
    }
    const delta = direction === 'credit' ? amount : -amount;
    w.balance = Math.max(0, (w.balance || 0) + delta);
    if (kind === 'customer' && direction === 'debit') w.totalSpent = (w.totalSpent || 0) + amount;
    if (kind === 'loyalty' && direction === 'credit') w.totalEarned = (w.totalEarned || 0) + amount;
    await w.save();

    try {
        const txn = await WalletTransaction.create({
            wallet: w._id,
            type,
            direction,
            amount,
            balanceAfter: w.balance,
            note: params.note || '',
            refCode: params.refCode || '',
            booking: params.booking || null,
            payment: params.payment || null,
        });
        return { wallet: w, txn };
    } catch (e: any) {
        // Duplicate refCode — treat as already-posted, roll back the balance change.
        if (e?.code === 11000) {
            w.balance = Math.max(0, w.balance - delta);
            await w.save();
            const existing = await WalletTransaction.findOne({ wallet: w._id, refCode: params.refCode }).lean();
            return { wallet: w, txn: existing };
        }
        throw e;
    }
}

export const walletService = {
    async getSummary(userId: string) {
        const [money, loyalty] = await Promise.all([
            getOrCreate(userId, 'customer'),
            getOrCreate(userId, 'loyalty'),
        ]);
        return {
            money: {
                balance: money.balance,
                currency: money.currency,
                totalSpent: money.totalSpent || 0,
            },
            loyalty: {
                balance: loyalty.balance,
                currency: loyalty.currency,
                totalEarned: loyalty.totalEarned || 0,
                maxUsagePct: LOYALTY_MAX_USAGE_PCT,
            },
        };
    },

    async listTransactions(userId: string, opts: { kind?: 'money' | 'loyalty'; limit?: number } = {}) {
        const kind: 'customer' | 'loyalty' = opts.kind === 'loyalty' ? 'loyalty' : 'customer';
        const w = await getOrCreate(userId, kind);
        const limit = Math.min(Math.max(opts.limit || 25, 1), 100);
        const items = await WalletTransaction.find({ wallet: w._id })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();
        return items.map((t: any) => ({
            id: String(t._id),
            type: t.type,
            direction: t.direction,
            amount: t.amount,
            balanceAfter: t.balanceAfter,
            note: t.note,
            booking: t.booking ? String(t.booking) : null,
            createdAt: t.createdAt,
        }));
    },

    async addMoney(userId: string, amount: number, method: 'upi' | 'card' | 'netbanking' = 'upi') {
        if (!Number.isFinite(amount) || amount < 10) throw errors.badRequest('Minimum topup is ₹10', 'TOPUP_MIN');
        if (amount > 100000) throw errors.badRequest('Maximum topup is ₹1,00,000', 'TOPUP_MAX');
        // Mock payment: internal provider, captured immediately.
        const payment = await Payment.create({
            user: userId,
            method,
            provider: 'internal',
            amount,
            status: 'captured',
            capturedAt: new Date(),
            meta: { source: 'wallet_topup' },
        });
        const { wallet, txn } = await postTxn({
            userId,
            kind: 'customer',
            type: 'topup',
            direction: 'credit',
            amount,
            note: `Wallet topup (${method})`,
            refCode: `topup:${payment._id}`,
            payment: String(payment._id),
        });
        return {
            balance: wallet.balance,
            txn: txn ? {
                id: String((txn as any)._id),
                type: (txn as any).type,
                direction: (txn as any).direction,
                amount: (txn as any).amount,
                balanceAfter: (txn as any).balanceAfter,
                createdAt: (txn as any).createdAt,
            } : null,
        };
    },

    /** Award loyalty bonus (called from other services, e.g. on trip completion). */
    async awardLoyalty(userId: string, amount: number, refCode: string, note = 'Loyalty bonus') {
        return postTxn({
            userId,
            kind: 'loyalty',
            type: 'bonus',
            direction: 'credit',
            amount,
            note,
            refCode,
        });
    },
};

export default walletService;
