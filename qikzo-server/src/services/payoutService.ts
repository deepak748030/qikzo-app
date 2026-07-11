import Payout from '../models/Payout';
import Wallet from '../models/Wallet';
import { errors } from '../lib/errors';
import { riderService } from './riderService';

async function getRiderWallet(riderId: any) {
    let w = await Wallet.findOne({ owner: riderId, kind: 'rider' });
    if (!w) w = await Wallet.create({ owner: riderId, kind: 'rider' });
    return w;
}

export const payoutService = {
    async getMethod(userId: string) {
        const rider = await riderService.getOrCreateForUser(userId);
        return (rider as any).payoutMethod || null;
    },

    async setMethod(userId: string, patch: {
        method: 'upi' | 'bank';
        accountHolder?: string;
        accountNumber?: string;
        ifsc?: string;
        bankName?: string;
        upiId?: string;
    }) {
        const rider = await riderService.getOrCreateForUser(userId);
        if (patch.method === 'bank') {
            if (!patch.accountHolder || !/^\d{9,18}$/.test((patch.accountNumber || '').replace(/\s+/g, ''))
                || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test((patch.ifsc || '').toUpperCase().trim())
                || !patch.bankName) {
                throw errors.badRequest('Invalid bank details', 'INVALID_BANK');
            }
        } else if (patch.method === 'upi') {
            if (!patch.upiId || !/^[\w.\-]{2,}@[\w.\-]{2,}$/.test(patch.upiId)) {
                throw errors.badRequest('Invalid UPI id', 'INVALID_UPI');
            }
        }
        (rider as any).payoutMethod = {
            method: patch.method,
            accountHolder: patch.accountHolder?.trim() || '',
            accountNumber: (patch.accountNumber || '').replace(/\s+/g, ''),
            ifsc: (patch.ifsc || '').toUpperCase().trim(),
            bankName: patch.bankName?.trim() || '',
            upiId: patch.upiId?.trim() || '',
            updatedAt: new Date(),
        };
        await rider.save();
        return (rider as any).payoutMethod;
    },

    async list(userId: string) {
        const rider = await riderService.getOrCreateForUser(userId);
        return Payout.find({ rider: rider._id }).sort({ createdAt: -1 }).limit(50).lean();
    },

    async request(userId: string, amount: number) {
        const rider = await riderService.getOrCreateForUser(userId);
        const method = (rider as any).payoutMethod;
        if (!method?.method) throw errors.badRequest('Add payout method first', 'NO_PAYOUT_METHOD');
        if (!Number.isFinite(amount) || amount < 1) throw errors.badRequest('Invalid amount', 'INVALID_AMOUNT');
        const wallet = await getRiderWallet(rider._id);
        if (wallet.balance < amount) throw errors.badRequest('Insufficient balance', 'INSUFFICIENT_BALANCE');
        return Payout.create({
            rider: rider._id,
            amount,
            method: method.method,
            upiId: method.upiId,
            bank: {
                accountName: method.accountHolder,
                accountNo: method.accountNumber,
                ifsc: method.ifsc,
            },
        });
    },
};

export default payoutService;
