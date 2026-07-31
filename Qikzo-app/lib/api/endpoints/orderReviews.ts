import { http } from '../client';

export type OrderReview = {
    _id: string;
    booking: string;
    categorySlug: string;
    stars: number;
    quality: number | null;
    packaging: number | null;
    accuracy: number | null;
    comment: string;
    tags: string[];
    photos: string[];
    createdAt: string;
};

export type SubmitOrderReviewInput = {
    bookingId: string;
    stars: number;
    quality?: number;
    packaging?: number;
    accuracy?: number;
    comment?: string;
    tags?: string[];
    photos?: string[];
};

/**
 * Order (item) reviews — how the delivered food / medicines / groceries were.
 * Completely separate from the rider rating (`ratingsApi`).
 */
export const orderReviewsApi = {
    submit(input: SubmitOrderReviewInput) {
        return http.post<{ review: OrderReview }>('/order-reviews', input);
    },
    getForBooking(bookingId: string) {
        return http.get<{ review: OrderReview | null }>(`/order-reviews/booking/${bookingId}`);
    },
    listMine(limit?: number) {
        return http.get<{ items: OrderReview[] }>('/order-reviews/me', limit ? { query: { limit } } : undefined);
    },
};

export default orderReviewsApi;
