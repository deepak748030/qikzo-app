import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * OrderReview — the customer's review of *what was delivered* (the food,
 * medicines, groceries, parcel …), kept completely separate from the rider
 * rating stored in `Rating`. One review per booking, authored by the booking's
 * customer only.
 *
 * Why a separate collection instead of extra fields on Rating:
 *  - a customer may rate the items but skip the rider (and vice-versa);
 *  - order quality rolls up per category / per booking, rider stars roll up
 *    onto the rider profile. Mixing them would corrupt both averages.
 */
const OrderReviewSchema = new Schema(
    {
        booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true, index: true },
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        // Denormalised for cheap analytics (avg stars for `food` vs `medicines`).
        categorySlug: { type: String, required: true, index: true },

        // Overall item/order satisfaction.
        stars: { type: Number, required: true, min: 1, max: 5 },
        // Optional sub-scores — omitted (null) when the customer skips them.
        quality: { type: Number, default: null, min: 1, max: 5 },
        packaging: { type: Number, default: null, min: 1, max: 5 },
        accuracy: { type: Number, default: null, min: 1, max: 5 },

        comment: { type: String, default: '', maxlength: 800 },
        tags: { type: [String], default: [] },
        photos: { type: [String], default: [] },
    },
    { timestamps: true },
);

OrderReviewSchema.index({ categorySlug: 1, createdAt: -1 });
OrderReviewSchema.index({ user: 1, createdAt: -1 });

export type OrderReviewDoc = InferSchemaType<typeof OrderReviewSchema> & { _id: any };
export const OrderReview = model<OrderReviewDoc>('OrderReview', OrderReviewSchema);
export default OrderReview;
