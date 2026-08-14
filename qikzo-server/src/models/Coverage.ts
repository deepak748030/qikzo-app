import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * Coverage — reusable city → area polygons.
 * Draw a city/area once, then pick it on banners so admins don't
 * re-trace the same map for every promo.
 */
const AreaSchema = new Schema(
    {
        name: { type: String, required: true, trim: true },
        polygon: {
            type: { type: String, enum: ['Polygon'], default: 'Polygon' },
            coordinates: { type: [[[Number]]], required: true },
        },
        coord: {
            lat: { type: Number, required: true },
            lng: { type: Number, required: true },
        },
        active: { type: Boolean, default: true },
    },
    { _id: true, timestamps: false },
);

const CoverageCitySchema = new Schema(
    {
        name: { type: String, required: true, trim: true },
        slug: { type: String, required: true, unique: true, index: true },
        active: { type: Boolean, default: true },
        areas: { type: [AreaSchema], default: [] },
    },
    { timestamps: true },
);

CoverageCitySchema.index({ 'areas.polygon': '2dsphere' });

export type CoverageCityDoc = InferSchemaType<typeof CoverageCitySchema> & { _id: any };
export const CoverageCity = model<CoverageCityDoc>('CoverageCity', CoverageCitySchema);
export default CoverageCity;
