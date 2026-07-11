import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * CouponRedemption — one row per (coupon, booking). Composite unique so a
 * booking can never redeem the same coupon twice, and per-user caps are cheap
 * counting queries.
 */
const CouponRedemptionSchema = new Schema(
    {
        coupon: { type: Schema.Types.ObjectId, ref: 'Coupon', required: true, index: true },
        code: { type: String, required: true, uppercase: true, index: true },
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
        discount: { type: Number, required: true, min: 0 },
    },
    { timestamps: true },
);

CouponRedemptionSchema.index({ coupon: 1, user: 1 });

export type CouponRedemptionDoc = InferSchemaType<typeof CouponRedemptionSchema> & { _id: any };
export const CouponRedemption = model<CouponRedemptionDoc>('CouponRedemption', CouponRedemptionSchema);
export default CouponRedemption;
