import { Schema, model, type InferSchemaType } from 'mongoose';

export const COUPON_DISCOUNT_TYPES = ['flat', 'percent'] as const;
export type CouponDiscountType = (typeof COUPON_DISCOUNT_TYPES)[number];

/**
 * Coupon — admin-created discount code. Stateless from the booking's
 * perspective: bookings snapshot the code + discount amount. Redemptions are
 * tracked separately via CouponRedemption for per-user and global caps.
 */
const CouponSchema = new Schema(
    {
        code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
        title: { type: String, default: '' },
        description: { type: String, default: '' },
        discountType: { type: String, enum: COUPON_DISCOUNT_TYPES, required: true },
        // For `flat` this is rupees; for `percent` it's a whole-number percentage (e.g. 20).
        discountValue: { type: Number, required: true, min: 0 },
        maxDiscount: { type: Number, default: 0 }, // cap in rupees for percent coupons; 0 = no cap
        minOrder: { type: Number, default: 0 },
        // Optional category restriction — empty means "any".
        categorySlugs: [{ type: String }],
        // First-order-only, unlimited-per-user, or capped.
        firstOrderOnly: { type: Boolean, default: false },
        maxPerUser: { type: Number, default: 0 }, // 0 = unlimited
        maxTotal: { type: Number, default: 0 }, // 0 = unlimited
        startsAt: { type: Date, default: null },
        expiresAt: { type: Date, default: null },
        active: { type: Boolean, default: true, index: true },
        redemptionsCount: { type: Number, default: 0 },
    },
    { timestamps: true },
);

export type CouponDoc = InferSchemaType<typeof CouponSchema> & { _id: any };
export const Coupon = model<CouponDoc>('Coupon', CouponSchema);
export default Coupon;
