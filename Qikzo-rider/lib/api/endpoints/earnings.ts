import { http } from '../client';

export type EarningsSummary = {
    today: number;
    todayTrips: number;
    todayHours: number;
    week: number;
    weekTrips: number;
    month: number;
    monthTrips: number;
    weekly: number[]; // Mon..Sun
};

export const earningsApi = {
    async summary(): Promise<EarningsSummary> {
        const res = await http.get<{ summary: EarningsSummary }>('/riders/me/earnings');
        return res.summary;
    },
};

export default earningsApi;
