import { http } from '../client';

/**
 * Ratings — customer submits after `Delivered`. Server enforces one rating
 * per booking; `getForBooking` returns null when unrated.
 */
export const ratingsApi = {
    submit(input: { bookingId: string; stars: number; comment?: string; tags?: string[] }) {
        return http<{ rating: any }>('/ratings', { method: 'POST', body: input });
    },
    getForBooking(bookingId: string) {
        return http<{ rating: any | null }>(`/ratings/booking/${bookingId}`);
    },
    listForRider(riderId: string, limit?: number) {
        return http<{ items: any[] }>(`/ratings/rider/${riderId}`, { query: limit ? { limit } : undefined });
    },
};

export default ratingsApi;
