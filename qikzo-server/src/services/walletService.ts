import Wallet from '../models/Wallet';
import WalletTransaction, { type TxnType } from '../models/WalletTransaction';
import Payment from '../models/Payment';
import Booking from '../models/Booking';
import { errors } from '../lib/errors';
import rewardService from './rewardService';

/**
 * Wallet service.
 *
 * Two wallets per user:
 *   - `customer` — real money (topups, refunds, trip debits). Exposed as **money**.
 *   - `loyalty`  — the **bonus** wallet. Earned on topups and referrals; usage
 *                  is capped at `RewardConfig.bonus.maxUsagePct` of any bill so
 *                  a customer can never clear a whole bill with bonus alone.
 *
 * All balance changes go through `postTxn` so `Wallet.balance` and the ledger
 * stay in sync. Never mutate `balance` directly.
 */

/** Legacy fallback — the live value comes from RewardConfig.bonus.maxUsagePct. */
export const LOYALTY_MAX_USAGE_PCT = 10;

type WalletKindDb = 'customer' | 'loyalty';
/** Public wallet names used by every client. */
export type PublicWallet = 'money' | 'bonus';

const toDbKind = (w: PublicWallet | 'loyalty'): WalletKindDb =>
    w === 'money' ? 'customer' : 'loyalty';

async function getOrCreate(userId: string, kind: WalletKindDb) {
    let w = await Wallet.findOne({ owner: userId, kind });
    if (!w) w = await Wallet.create({ owner: userId, kind });
    return w;
}

async function postTxn(params: {
    userId: string;
    kind: WalletKindDb;
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
    if (kind === 'customer' && direction === 'credit') w.totalEarned = (w.totalEarned || 0) + amount;
    if (kind === 'loyalty' && direction === 'credit') w.totalEarned = (w.totalEarned || 0) + amount;
    if (kind === 'loyalty' && direction === 'debit') w.totalSpent = (w.totalSpent || 0) + amount;
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
            if (kind === 'customer' && direction === 'debit') w.totalSpent = Math.max(0, (w.totalSpent || 0) - amount);
            if (direction === 'credit') w.totalEarned = Math.max(0, (w.totalEarned || 0) - amount);
            if (kind === 'loyalty' && direction === 'debit') w.totalSpent = Math.max(0, (w.totalSpent || 0) - amount);
            await w.save();
            const existing = await WalletTransaction.findOne({ wallet: w._id, refCode: params.refCode }).lean();
            return { wallet: w, txn: existing };
        }
        throw e;
    }
}

/** Max bonus spendable on a bill of `amount`, given balance + admin cap. */
function bonusUsable(amount: number, bonusBalance: number, maxUsagePct: number) {
    const cap = Math.floor((amount * Math.max(0, Math.min(100, maxUsagePct))) / 100);
    return Math.max(0, Math.min(cap, Math.floor(bonusBalance)));
}

export const walletService = {
    async getSummary(userId: string) {
        const [money, bonus, cfg] = await Promise.all([
            getOrCreate(userId, 'customer'),
            getOrCreate(userId, 'loyalty'),
            rewardService.getConfig(),
        ]);
        const bonusBlock = {
            balance: bonus.balance,
            currency: bonus.currency,
            totalEarned: bonus.totalEarned || 0,
            totalSpent: bonus.totalSpent || 0,
            maxUsagePct: cfg.bonus.maxUsagePct,
        };
        return {
            money: {
                balance: money.balance,
                currency: money.currency,
                totalSpent: money.totalSpent || 0,
                totalEarned: money.totalEarned || 0,
            },
            bonus: bonusBlock,
            // Back-compat alias for older app builds still reading `loyalty`.
            loyalty: bonusBlock,
            config: {
                bonusEnabled: cfg.bonus.enabled,
                maxUsagePct: cfg.bonus.maxUsagePct,
                minTopup: cfg.bonus.minTopup,
                maxTopup: cfg.bonus.maxTopup,
                tiers: cfg.bonus.tiers,
            },
        };
    },

    async listTransactions(userId: string, opts: { kind?: PublicWallet | 'loyalty'; limit?: number } = {}) {
        const kind = toDbKind(opts.kind === 'money' ? 'money' : opts.kind ? 'bonus' : 'money');
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

    /** Preview the bonus a topup would earn — powers the "+₹20 bonus" hint. */
    async quoteTopup(amount: number) {
        const cfg = await rewardService.getConfig();
        const valid = Number.isFinite(amount) && amount >= cfg.bonus.minTopup && amount <= cfg.bonus.maxTopup;
        const bonus = valid ? rewardService.bonusForTopup(cfg, amount) : 0;
        return {
            amount: Number(amount) || 0,
            bonus,
            total: (Number(amount) || 0) + bonus,
            valid,
            minTopup: cfg.bonus.minTopup,
            maxTopup: cfg.bonus.maxTopup,
            tiers: cfg.bonus.tiers,
        };
    },

    async addMoney(userId: string, amount: number, method: 'upi' | 'card' | 'netbanking' = 'upi') {
        const cfg = await rewardService.getConfig();
        if (!Number.isFinite(amount) || amount < cfg.bonus.minTopup) {
            throw errors.badRequest(`Minimum topup is ₹${cfg.bonus.minTopup}`, 'TOPUP_MIN');
        }
        if (amount > cfg.bonus.maxTopup) {
            throw errors.badRequest(`Maximum topup is ₹${cfg.bonus.maxTopup}`, 'TOPUP_MAX');
        }
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

        // Admin-configured bonus lands in the bonus wallet, not the money one.
        const bonusAmount = rewardService.bonusForTopup(cfg, amount);
        let bonusBalance: number | null = null;
        if (bonusAmount > 0) {
            const res = await postTxn({
                userId,
                kind: 'loyalty',
                type: 'bonus',
                direction: 'credit',
                amount: bonusAmount,
                note: `Topup bonus on ₹${amount}`,
                refCode: `topup-bonus:${payment._id}`,
                payment: String(payment._id),
            });
            bonusBalance = res.wallet.balance;
        } else {
            const bw = await getOrCreate(userId, 'loyalty');
            bonusBalance = bw.balance;
        }

        return {
            balance: wallet.balance,
            bonusEarned: bonusAmount,
            bonusBalance,
            credited: amount + bonusAmount,
            txn: txn
                ? {
                      id: String((txn as any)._id),
                      type: (txn as any).type,
                      direction: (txn as any).direction,
                      amount: (txn as any).amount,
                      balanceAfter: (txn as any).balanceAfter,
                      createdAt: (txn as any).createdAt,
                  }
                : null,
        };
    },

    /**
     * How a bill of `amount` would be split across the two wallets.
     * Bonus is applied first but never beyond the admin cap.
     */
    async quotePayment(userId: string, amount: number) {
        const [summary, cfg] = await Promise.all([this.getSummary(userId), rewardService.getConfig()]);
        const amt = Math.max(0, Math.round(Number(amount) || 0));
        const fromBonus = bonusUsable(amt, summary.bonus.balance, cfg.bonus.maxUsagePct);
        const fromMoney = amt - fromBonus;
        return {
            amount: amt,
            fromBonus,
            fromMoney,
            maxUsagePct: cfg.bonus.maxUsagePct,
            moneyBalance: summary.money.balance,
            bonusBalance: summary.bonus.balance,
            canPay: summary.money.balance >= fromMoney,
            shortfall: Math.max(0, fromMoney - summary.money.balance),
        };
    },

    /**
     * Charge a booking to the wallet. Debits bonus (capped) then money, both
     * idempotent on the booking id so a retry can never double-charge.
     */
    async payForBooking(userId: string, bookingId: string) {
        const booking = await Booking.findOne({ _id: bookingId, user: userId });
        if (!booking) throw errors.notFound('Booking not found', 'BOOKING_NOT_FOUND');
        if ((booking as any).paymentStatus === 'paid') {
            return { alreadyPaid: true, bookingId: String(booking._id) };
        }
        const amount = Math.round(Number(booking.price) || 0);
        if (amount <= 0) throw errors.badRequest('Nothing to pay', 'BAD_AMOUNT');

        const quote = await this.quotePayment(userId, amount);
        if (!quote.canPay) {
            throw errors.badRequest(
                `Add ₹${quote.shortfall} to your wallet to pay for this booking`,
                'INSUFFICIENT_FUNDS'
            );
        }

        if (quote.fromBonus > 0) {
            await postTxn({
                userId,
                kind: 'loyalty',
                type: 'trip_debit',
                direction: 'debit',
                amount: quote.fromBonus,
                note: `Bonus used on ${booking.code}`,
                refCode: `booking-bonus:${booking._id}`,
                booking: String(booking._id),
            });
        }
        if (quote.fromMoney > 0) {
            try {
                await postTxn({
                    userId,
                    kind: 'customer',
                    type: 'trip_debit',
                    direction: 'debit',
                    amount: quote.fromMoney,
                    note: `Wallet payment for ${booking.code}`,
                    refCode: `booking-money:${booking._id}`,
                    booking: String(booking._id),
                });
            } catch (e) {
                // Money leg failed — return the bonus we just took.
                if (quote.fromBonus > 0) {
                    await postTxn({
                        userId,
                        kind: 'loyalty',
                        type: 'refund',
                        direction: 'credit',
                        amount: quote.fromBonus,
                        note: `Reversed bonus for ${booking.code}`,
                        refCode: `booking-bonus-rev:${booking._id}`,
                        booking: String(booking._id),
                    }).catch(() => {});
                }
                throw e;
            }
        }

        (booking as any).payment = 'wallet';
        (booking as any).paymentStatus = 'paid';
        (booking as any).paymentPaidAt = new Date();
        (booking as any).paymentTxnId = `WALLET-${booking._id}`;
        (booking as any).walletPaid = { money: quote.fromMoney, bonus: quote.fromBonus };
        (booking.history as any).push({
            status: booking.status,
            note: `Paid from wallet (₹${quote.fromMoney} money + ₹${quote.fromBonus} bonus)`,
        });
        await booking.save();

        const summary = await this.getSummary(userId);
        return {
            alreadyPaid: false,
            bookingId: String(booking._id),
            paid: amount,
            fromMoney: quote.fromMoney,
            fromBonus: quote.fromBonus,
            moneyBalance: summary.money.balance,
            bonusBalance: summary.bonus.balance,
        };
    },

    /** Refund a wallet-paid booking back to the wallets it came from. */
    async refundBooking(userId: string, bookingId: string, reason = 'Booking cancelled') {
        const booking = await Booking.findOne({ _id: bookingId, user: userId });
        if (!booking) return null;
        const split = (booking as any).walletPaid;
        if ((booking as any).payment !== 'wallet' || !split) return null;
        if ((booking as any).paymentStatus !== 'paid') return null;

        if (split.bonus > 0) {
            await postTxn({
                userId,
                kind: 'loyalty',
                type: 'refund',
                direction: 'credit',
                amount: split.bonus,
                note: `${reason} — bonus refund (${booking.code})`,
                refCode: `booking-refund-bonus:${booking._id}`,
                booking: String(booking._id),
            }).catch(() => {});
        }
        if (split.money > 0) {
            await postTxn({
                userId,
                kind: 'customer',
                type: 'refund',
                direction: 'credit',
                amount: split.money,
                note: `${reason} — wallet refund (${booking.code})`,
                refCode: `booking-refund-money:${booking._id}`,
                booking: String(booking._id),
            }).catch(() => {});
        }
        (booking as any).paymentStatus = 'pending';
        (booking as any).paymentPaidAt = null;
        await booking.save();
        return { refunded: (split.money || 0) + (split.bonus || 0) };
    },

    /** Generic reward credit used by the referral programme. */
    async creditReward(params: {
        userId: string;
        wallet: PublicWallet;
        amount: number;
        note?: string;
        refCode: string;
    }) {
        if (!Number.isFinite(params.amount) || params.amount <= 0) return null;
        return postTxn({
            userId: params.userId,
            kind: toDbKind(params.wallet),
            type: 'bonus',
            direction: 'credit',
            amount: params.amount,
            note: params.note || 'Reward',
            refCode: params.refCode,
        });
    },

    /** Award bonus balance (kept for callers outside the reward programme). */
    async awardLoyalty(userId: string, amount: number, refCode: string, note = 'Bonus') {
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
