import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * VehicleType — admin-editable pricing per category (base fare, per-km, min
 * fare, surge multiplier). Replaces the hardcoded PRICE_BASE / PRICE_PER_KM
 * env vars flagged in AUDIT.md §3.7 so pricing can vary by city/vehicle.
 */
const VehicleTypeSchema = new Schema(
    {
        slug: { type: String, required: true, unique: true, index: true },
        name: { type: String, required: true },
        emoji: { type: String, default: '' },
        capacityKg: { type: Number, default: 0 },
        seats: { type: Number, default: 1 },
        // Categories this vehicle can serve (matches Category.slug).
        categories: [{ type: String, index: true }],
        pricing: {
            base: { type: Number, required: true },
            perKm: { type: Number, required: true },
            perMin: { type: Number, default: 0 },
            minFare: { type: Number, required: true },
            surge: { type: Number, default: 1 },
        },
        active: { type: Boolean, default: true },
        order: { type: Number, default: 0 },
    },
    { timestamps: true }
);

export type VehicleTypeDoc = InferSchemaType<typeof VehicleTypeSchema> & { _id: any };
export const VehicleType = model<VehicleTypeDoc>('VehicleType', VehicleTypeSchema);
export default VehicleType;
