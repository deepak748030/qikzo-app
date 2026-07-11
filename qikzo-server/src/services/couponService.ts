import Coupon from '../models/Coupon';
import CouponRedemption from '../models/CouponRedemption';
import Booking from '../models/Booking';
import { errors } from '../lib/errors';

/**
 * Coupons — quote + redeem. `quote()` is a pure read used by the checkout
 * screen to preview the discount. `redeem()` is called by bookingService at
 * booking-create time, in the same request that persists the booking.
 */
export const couponService = {
    /**
     * Compute the discount for a code without persisting anything. Throws on
     * hard invalidity (unknown, expired, inactive) so callers can surface a
     * clean error. Returns `{ coupon, discount, finalPrice }` on success.
     */
    async quote(input: {
        userId: string;
        code: string;
        subtotal: number;
        categorySlug?: string;
    }) {
        const code = String(input.code || '').trim().toUpperCase();
        if (!code) throw errors.badRequest('Coupon code required', 'COUPON_REQUIRED');
        const coupon = await Coupon.findOne({ code });
        if (!coupon || !coupon.active) throw errors.badRequest('Invalid coupon', 'COUPON_INVALID');
        const now = new Date();
        if (coupon.startsAt && coupon.startsAt > now) throw errors.badRequest('Coupon not yet active', 'COUPON_INACTIVE');
        if (coupon.expiresAt && coupon.expiresAt < now) throw errors.badRequest('Coupon expired', 'COUPON_EXPIRED');
        if (coupon.minOrder && input.subtotal < coupon.minOrder) {
            throw errors.badRequest(`Add items worth ₹${coupon.minOrder - input.subtotal} more`, 'COUPON_MIN_ORDER');
        }
        if (coupon.categorySlugs?.length && input.categorySlug && !coupon.categorySlugs.includes(input.categorySlug)) {
            throw errors.badRequest('Coupon not valid for this category', 'COUPON_CATEGORY');
        }

        if (coupon.firstOrderOnly) {
            const prior = await Booking.countDocuments({ user: input.userId, status: { $ne: 'Cancelled' } });
            if (prior > 0) throw errors.badRequest('Coupon valid on first order only', 'COUPON_FIRST_ORDER');
        }

        if (coupon.maxPerUser > 0) {
            const used = await CouponRedemption.countDocuments({ coupon: coupon._id, user: input.userId });
            if (used >= coupon.maxPerUser) throw errors.badRequest('Coupon usage limit reached', 'COUPON_USER_LIMIT');
        }
        if (coupon.maxTotal > 0 && coupon.redemptionsCount >= coupon.maxTotal) {
            throw errors.badRequest('Coupon fully redeemed', 'COUPON_EXHAUSTED');
        }

        let discount = 0;
        if (coupon.discountType === 'flat') {
            discount = Math.min(coupon.discountValue, input.subtotal);
        } else {
            discount = Math.round((input.subtotal * coupon.discountValue) / 100);
            if (coupon.maxDiscount > 0) discount = Math.min(discount, coupon.maxDiscount);
        }
        // Never let discount exceed subtotal minus a floor of ₹1.
        discount = Math.max(0, Math.min(discount, Math.max(0, input.subtotal - 1)));
        return {
            coupon,
            code,
            discount,
            finalPrice: Math.max(0, input.subtotal - discount),
        };
    },

    /**
     * Record the redemption tied to a booking. Idempotent per (coupon,
     * booking) thanks to the unique index — a retry from the same booking
     * won't inflate counts. Safe to call inside bookingService.create.
     */
    async redeem(params: {
        couponId: string;
        code: string;
        userId: string;
        bookingId: string;
        discount: number;
    }) {
        try {
            await CouponRedemption.create({
                coupon: params.couponId,
                code: params.code,
                user: params.userId,
                booking: params.bookingId,
                discount: params.discount,
            });
            await Coupon.updateOne({ _id: params.couponId }, { $inc: { redemptionsCount: 1 } });
        } catch (err: any) {
            if (err?.code === 11000) return; // duplicate — treat as idempotent
            throw err;
        }
    },
};

export default couponService;
