import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * CategoryBanner — the banner shown *inside* the customer app's Food /
 * Grocery tab. Deliberately a separate collection from `PromoBanner`:
 *
 *   PromoBanner     → home carousel + Explore grid, geo-targeted by a
 *                     Category → State → Area polygon (mandatory).
 *   CategoryBanner  → vertical list on the Food/Grocery screen, typed as
 *                     Food or Grocery and pinned to a single coordinate.
 *
 * Keeping them apart means `GET /banners`, `GET /admin/banners` and the home
 * screen keep behaving exactly as before — a new banner can never leak into
 * the home carousel.
 *
 * The coordinate is what the customer app drops into the booking draft as the
 * pickup location, so it is required rather than optional.
 */
const CategoryBannerSchema = new Schema(
    {
        title: { type: String, required: true, trim: true },
        type: { type: String, enum: ['food', 'grocery'], required: true, index: true },
        imageUrl: { type: String, required: true },
        description: { type: String, default: '' },
        address: { type: String, default: '' },

        // Becomes the customer's pickup point when they open this banner.
        coord: {
            lat: { type: Number, required: true },
            lng: { type: Number, required: true },
        },

        active: { type: Boolean, default: true, index: true },
        order: { type: Number, default: 0 },
    },
    { timestamps: true }
);

CategoryBannerSchema.index({ type: 1, active: 1, order: 1 });
CategoryBannerSchema.index({ title: 'text', description: 'text' });

export type CategoryBannerDoc = InferSchemaType<typeof CategoryBannerSchema> & { _id: any };
export const CategoryBanner = model<CategoryBannerDoc>('CategoryBanner', CategoryBannerSchema);
export default CategoryBanner;
