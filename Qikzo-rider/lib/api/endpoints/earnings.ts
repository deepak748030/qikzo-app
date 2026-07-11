import { http } from '../client';

export type EarningsSummary = {
    today: number;
    todayTrips: number;
    todayHours: number;
    week: number;
    weekTrips: number;
    weekHours: number;
    month: number;
    monthTrips: number;
    monthHours: number;
    weekly: number[]; // Mon..Sun
    cashCollected: number;
    upiCollected: number;
    nextPayoutAmount: number;
};

export const earningsApi = {
    async summary(): Promise<EarningsSummary> {
        const res = await http.get<{ summary: EarningsSummary }>('/riders/me/earnings');
        return res.summary;
    },
};

export default earningsApi;
