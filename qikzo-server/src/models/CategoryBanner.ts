import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * CategoryBanner — the banner shown *inside* the customer app's Food /
 * Grocery tab. Deliberately a separate collection from `PromoBanner`:
 *
 *   PromoBanner     → home carousel + Explore grid, geo-targeted by a
 *                     Category → State → Area polygon (mandatory).
 *   CategoryBanner  → vertical list on the Food/Grocery screen, targeted by
 *                     selected restaurants/stores (no polygon needed).
 *
 * Keeping them apart means `GET /banners`, `GET /admin/banners` and the home
 * screen keep behaving exactly as before — a new banner can never leak into
 * the home carousel.
 *
 * Targeting rule (the "ALL" flag):
 *   storeIds.length === 0  →  storeIdsEmpty = true   → every active merchant
 *                                                     of this banner's type
 *   storeIds.length  > 0   →  storeIdsEmpty = false  → only those merchants
 *
 * `storeIdsEmpty` is denormalised (and kept in sync by
 * `categoryBannerService.normaliseStores`) so the public list query can filter
 * without inspecting array length.
 */
const CategoryBannerSchema = new Schema(
    {
        title: { type: String, required: true, trim: true },
        type: { type: String, enum: ['food', 'grocery'], required: true, index: true },
        imageUrl: { type: String, required: true },
        description: { type: String, default: '' },

        storeIds: { type: [{ type: Schema.Types.ObjectId, ref: 'Restaurant' }], default: [] },
        storeIdsEmpty: { type: Boolean, default: true, index: true },
        // Snapshot of the selected names so the customer list is one query
        // (no populate on a scrolling list). Refreshed on every save.
        storeNames: { type: [String], default: [] },

        active: { type: Boolean, default: true, index: true },
        order: { type: Number, default: 0 },
    },
    { timestamps: true }
);

CategoryBannerSchema.index({ type: 1, active: 1, order: 1 });
CategoryBannerSchema.index({ storeIds: 1 });
CategoryBannerSchema.index({ title: 'text', description: 'text' });

export type CategoryBannerDoc = InferSchemaType<typeof CategoryBannerSchema> & { _id: any };
export const CategoryBanner = model<CategoryBannerDoc>('CategoryBanner', CategoryBannerSchema);
export default CategoryBanner;
