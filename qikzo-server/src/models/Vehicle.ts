import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * Vehicle — a physical vehicle owned/driven by a rider. A rider may register
 * more than one over time (upgrade/change) but only one is `primary`.
 */
const VehicleSchema = new Schema(
    {
        rider: { type: Schema.Types.ObjectId, ref: 'Rider', required: true, index: true },
        typeSlug: { type: String, required: true, index: true }, // → VehicleType.slug
        make: { type: String, default: '' },
        modelName: { type: String, default: '' },
        colour: { type: String, default: '' },
        year: { type: Number, default: null },
        plateNo: { type: String, required: true, uppercase: true, trim: true },
        rcNumber: { type: String, default: '' },
        insuranceExpiry: { type: Date, default: null },
        photos: [{ type: String }], // storage keys
        primary: { type: Boolean, default: true },
        active: { type: Boolean, default: true },
    },
    { timestamps: true }
);

VehicleSchema.index({ rider: 1, primary: 1 });
VehicleSchema.index({ plateNo: 1 }, { unique: true });

export type VehicleDoc = InferSchemaType<typeof VehicleSchema> & { _id: any };
export const Vehicle = model<VehicleDoc>('Vehicle', VehicleSchema);
export default Vehicle;
