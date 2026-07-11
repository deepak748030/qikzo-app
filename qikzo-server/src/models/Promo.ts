import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * Promo — inline app-content promo card (different from Coupon, which is a
 * redeemable code). Rendered on the home screen alongside `PromoBanner`.
 * Kept separate so the marketing team can push copy without minting codes.
 */
const PromoSchema = new Schema(
    {
        slug: { type: String, required: true, unique: true, index: true },
        title: { type: String, required: true },
        subtitle: { type: String, default: '' },
        imageUrl: { type: String, default: '' },
        ctaLabel: { type: String, default: '' },
        ctaUrl: { type: String, default: '' },
        audience: { type: String, enum: ['all', 'customer', 'rider'], default: 'all', index: true },
        active: { type: Boolean, default: true, index: true },
        order: { type: Number, default: 0 },
        startsAt: { type: Date, default: null },
        endsAt: { type: Date, default: null },
    },
    { timestamps: true }
);

export type PromoDoc = InferSchemaType<typeof PromoSchema> & { _id: any };
export const Promo = model<PromoDoc>('Promo', PromoSchema);
export default Promo;
