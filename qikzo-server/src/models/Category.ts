import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * Category → State → Area hierarchy.
 * An Area's serviceable region is stored as a GeoJSON Polygon so we can later
 * run `$geoIntersects` queries against a customer's pickup point to decide
 * whether the category is available in that location.
 *
 * Polygon coordinates format (GeoJSON):
 *   [[[lng, lat], [lng, lat], ..., [lng, lat]]]   (first == last, min 4 points → 3 unique)
 */
const AreaSchema = new Schema(
    {
        name: { type: String, required: true, trim: true },
        polygon: {
            type: {
                type: String,
                enum: ['Polygon'],
                default: 'Polygon',
                required: true,
            },
            coordinates: {
                type: [[[Number]]],
                required: true,
                validate: {
                    validator(v: number[][][]) {
                        if (!Array.isArray(v) || v.length === 0) return false;
                        const ring = v[0];
                        if (!Array.isArray(ring) || ring.length < 4) return false;
                        const [fx, fy] = ring[0]; const [lx, ly] = ring[ring.length - 1];
                        return fx === lx && fy === ly;
                    },
                    message: 'Polygon must be a closed ring with at least 3 unique points',
                },
            },
        },
        active: { type: Boolean, default: true },
    },
    { _id: true, timestamps: false },
);

const StateSchema = new Schema(
    {
        name: { type: String, required: true, trim: true },
        active: { type: Boolean, default: true },
        areas: { type: [AreaSchema], default: [] },
    },
    { _id: true, timestamps: false },
);

const CategorySchema = new Schema(
    {
        slug: { type: String, required: true, unique: true, index: true },
        name: { type: String, required: true },
        emoji: { type: String, default: '' },
        imageUrl: { type: String, default: '' },
        hint: { type: String, default: '' },
        order: { type: Number, default: 0 },
        active: { type: Boolean, default: true },
        states: { type: [StateSchema], default: [] },
    },
    { timestamps: true }
);

CategorySchema.index({ name: 'text', hint: 'text' });
// Geospatial index on nested area polygons — enables service-area lookups.
CategorySchema.index({ 'states.areas.polygon': '2dsphere' });

export type CategoryDoc = InferSchemaType<typeof CategorySchema> & { _id: any };
export const Category = model<CategoryDoc>('Category', CategorySchema);
export default Category;
