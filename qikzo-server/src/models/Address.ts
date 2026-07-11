import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * Address — full structured address book (distinct from `SavedPlace` which is
 * label-only for quick access). Kept alongside SavedPlace so we can migrate
 * the mobile UI gradually without breaking existing flows.
 */
const AddressSchema = new Schema(
    {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        label: { type: String, default: '' }, // "Home", "Office"
        line1: { type: String, required: true },
        line2: { type: String, default: '' },
        landmark: { type: String, default: '' },
        city: { type: String, default: '' },
        state: { type: String, default: '' },
        pincode: { type: String, default: '' },
        country: { type: String, default: 'IN' },
        contactName: { type: String, default: '' },
        contactPhone: { type: String, default: '' },
        location: {
            type: { type: String, enum: ['Point'], default: 'Point' },
            coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
        },
        isDefault: { type: Boolean, default: false, index: true },
    },
    { timestamps: true }
);

AddressSchema.index({ location: '2dsphere' });
AddressSchema.index({ user: 1, isDefault: 1 });

export type AddressDoc = InferSchemaType<typeof AddressSchema> & { _id: any };
export const Address = model<AddressDoc>('Address', AddressSchema);
export default Address;
