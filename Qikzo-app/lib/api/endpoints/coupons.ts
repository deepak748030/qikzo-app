import { http } from '../client';

/**
 * Coupons — customer preview only. Actual redemption is server-side inside
 * booking creation.
 */
export const couponsApi = {
    quote(input: { code: string; subtotal: number; categorySlug?: string }) {
        return http<{
            code: string;
            discount: number;
            finalPrice: number;
            title: string;
            description: string;
        }>('/coupons/quote', { method: 'POST', body: input });
    },
};

export default couponsApi;
