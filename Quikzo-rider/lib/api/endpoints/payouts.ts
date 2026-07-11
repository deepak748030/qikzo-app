import { http } from '../client';

export type PayoutMethod = {
    method: 'upi' | 'bank' | null;
    accountHolder?: string;
    accountNumber?: string;
    ifsc?: string;
    bankName?: string;
    upiId?: string;
    updatedAt?: string | null;
} | null;

export type Payout = {
    _id: string;
    amount: number;
    currency: string;
    status: 'requested' | 'processing' | 'paid' | 'failed' | 'cancelled';
    method: 'upi' | 'bank';
    upiId?: string;
    bank?: { accountName: string; accountNo: string; ifsc: string };
    processedAt?: string | null;
    createdAt: string;
};

export const payoutsApi = {
    async getMethod(): Promise<PayoutMethod> {
        const res = await http.get<{ method: PayoutMethod }>('/riders/me/payout-method');
        return res.method;
    },
    async setMethod(patch: {
        method: 'upi' | 'bank';
        accountHolder?: string;
        accountNumber?: string;
        ifsc?: string;
        bankName?: string;
        upiId?: string;
    }): Promise<PayoutMethod> {
        const res = await http.put<{ method: PayoutMethod }>('/riders/me/payout-method', patch);
        return res.method;
    },
    async list(): Promise<Payout[]> {
        const res = await http.get<{ items: Payout[] }>('/riders/me/payouts');
        return res.items;
    },
    async request(amount: number): Promise<Payout> {
        const res = await http.post<{ payout: Payout }>('/riders/me/payouts', { amount });
        return res.payout;
    },
};

export default payoutsApi;
