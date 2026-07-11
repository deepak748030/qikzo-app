import { Schema, model, type InferSchemaType } from 'mongoose';

const PromoBannerSchema = new Schema(
    {
        slug: { type: String, required: true, unique: true, index: true },
        title: { type: String, required: true },
        subtitle: { type: String, default: '' },
        address: { type: String, default: '' },
        imageUrl: { type: String, default: '' },
        coord: {
            lat: { type: Number, required: true },
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
