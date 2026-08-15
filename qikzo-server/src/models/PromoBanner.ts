import { Schema, model, type InferSchemaType } from 'mongoose';

const PromoBannerSchema = new Schema(
    {
        slug: { type: String, required: true, unique: true, index: true },
        title: { type: String, required: true },
        subtitle: { type: String, default: '' },
        address: { type: String, default: '' },
        imageUrl: { type: String, default: '' },
        // Food banners may include a photographed restaurant menu. It is kept
        // separate from the promo artwork so the customer can read it while
        // composing an order. Empty means the admin chose to skip it.
        menuImageUrl: { type: String, default: '' },
        // Geo targeting: banner is linked to a Category → State → Area.
        // The area polygon is copied here so the customer app can match a
        // pickup point without re-reading the category tree.
        categoryId: { type: Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
        categorySlug: { type: String, default: '' },
        stateId: { type: String, default: '' },
        stateName: { type: String, default: '' },
        areaId: { type: String, default: '' },
        areaName: { type: String, default: '' },
        polygon: {
            type: {
                type: String,
                enum: ['Polygon'],
            },
            coordinates: { type: [[[Number]]] },
        },
        coord: {
            lat: { type: Number, required: true }, // derived from the area polygon centroid
            lng: { type: Number, required: true },
        },
        active: { type: Boolean, default: true },
        order: { type: Number, default: 0 },
    },
    { timestamps: true }
);

PromoBannerSchema.index({ title: 'text', subtitle: 'text' });

export type PromoBannerDoc = InferSchemaType<typeof PromoBannerSchema> & { _id: any };
export const PromoBanner = model<PromoBannerDoc>('PromoBanner', PromoBannerSchema);
export default PromoBanner;
