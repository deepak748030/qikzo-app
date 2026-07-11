import { http } from '../client';

/**
 * Ratings — customer submits after `Delivered`. Server enforces one rating
 * per booking; `getForBooking` returns null when unrated.
 */
export const ratingsApi = {
    submit(input: { bookingId: string; stars: number; comment?: string; tags?: string[] }) {
        return http.post<{ rating: any }>('/ratings', input);
    },
    getForBooking(bookingId: string) {
        return http.get<{ rating: any | null }>(`/ratings/booking/${bookingId}`);
    },
    listForRider(riderId: string, limit?: number) {
        return http.get<{ items: any[] }>(`/ratings/rider/${riderId}`, limit ? { query: { limit } } : undefined);
    },
};

export default ratingsApi;
