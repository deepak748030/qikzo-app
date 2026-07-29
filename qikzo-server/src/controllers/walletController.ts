import asyncHandler from '../middleware/asyncHandler';
import walletService from '../services/walletService';
import { ok } from '../lib/http';
import { errors } from '../lib/errors';

export const walletController = {
    summary: asyncHandler(async (req, res) => {
        const data = await walletService.getSummary(req.user!.id);
        return ok(res, data);
    }),

    transactions: asyncHandler(async (req, res) => {
        const kind = req.query.kind === 'loyalty' ? 'loyalty' : 'money';
        const limit = Number(req.query.limit) || 25;
        const items = await walletService.listTransactions(req.user!.id, { kind, limit });
        return ok(res, { items });
    }),

    topup: asyncHandler(async (req, res) => {
        const amount = Number(req.body?.amount);
        const method = (req.body?.method as 'upi' | 'card' | 'netbanking') || 'upi';
        if (!Number.isFinite(amount)) throw errors.badRequest('Amount required', 'BAD_AMOUNT');
        const result = await walletService.addMoney(req.user!.id, amount, method);
        return ok(res, result, 'Wallet topped up');
    }),
};

export default walletController;
