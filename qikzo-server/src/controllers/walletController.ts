import asyncHandler from '../middleware/asyncHandler';
import walletService from '../services/walletService';
import rewardService from '../services/rewardService';
import { ok } from '../lib/http';
import { errors } from '../lib/errors';

export const walletController = {
    summary: asyncHandler(async (req, res) => {
        const data = await walletService.getSummary(req.user!.id);
        return ok(res, data);
    }),

    /** Public (authed) view of the admin-tuned bonus rules. */
    config: asyncHandler(async (_req, res) => {
        const cfg = await rewardService.getConfig();
        return ok(res, { bonus: cfg.bonus });
    }),

    transactions: asyncHandler(async (req, res) => {
        const raw = String(req.query.kind || 'money');
        const kind = raw === 'bonus' || raw === 'loyalty' ? 'bonus' : 'money';
        const limit = Number(req.query.limit) || 25;
        const items = await walletService.listTransactions(req.user!.id, { kind, limit });
        return ok(res, { items });
    }),

    topupQuote: asyncHandler(async (req, res) => {
        const amount = Number(req.query.amount);
        const data = await walletService.quoteTopup(amount);
        return ok(res, data);
    }),

    topup: asyncHandler(async (req, res) => {
        const amount = Number(req.body?.amount);
        const method = (req.body?.method as 'upi' | 'card' | 'netbanking') || 'upi';
        if (!Number.isFinite(amount)) throw errors.badRequest('Amount required', 'BAD_AMOUNT');
        const result = await walletService.addMoney(req.user!.id, amount, method);
        const msg = result.bonusEarned > 0
            ? `₹${amount} added + ₹${result.bonusEarned} bonus`
            : 'Wallet topped up';
        return ok(res, result, msg);
    }),

    payQuote: asyncHandler(async (req, res) => {
        const amount = Number(req.query.amount);
        if (!Number.isFinite(amount)) throw errors.badRequest('Amount required', 'BAD_AMOUNT');
        const data = await walletService.quotePayment(req.user!.id, amount);
        return ok(res, data);
    }),

    pay: asyncHandler(async (req, res) => {
        const bookingId = String(req.body?.bookingId || '');
        if (!bookingId) throw errors.badRequest('bookingId required', 'BOOKING_REQUIRED');
        const data = await walletService.payForBooking(req.user!.id, bookingId);
        return ok(res, data, data.alreadyPaid ? 'Already paid' : 'Paid from wallet');
    }),
};

export default walletController;
