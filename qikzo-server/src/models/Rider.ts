import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * Rider — a driver identity (separate from User). Every rider is also linked
 * to a User doc (for auth/token minting) via `user`. `currentLocation` is a
 * GeoJSON Point kept fresh by the mobile app during online sessions so we can
 * do `$geoNear` for dispatch (Phase 4.6).
 */
const RiderSchema = new Schema(
    {
        user: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
        name: { type: String, required: true, trim: true },
        phone: { type: String, default: '', trim: true, index: true },
        vehicle: { type: String, required: true },
        vehicleNo: { type: String, required: true, uppercase: true, trim: true },
        // Rating starts at 0 — new riders have no ride history yet, so we
        // never seed a fake 5-star reputation. Rated after their first trip.
        rating: { type: Number, default: 0, min: 0, max: 5 },
        trips: { type: Number, default: 0 },
        online: { type: Boolean, default: true, index: true },
        available: { type: Boolean, default: true, index: true },

        // GeoJSON — required index for $geoNear during dispatch.
        currentLocation: {
            type: { type: String, enum: ['Point'], default: 'Point' },
            coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
            updatedAt: { type: Date, default: null },
        },
        kycStatus: { type: String, enum: ['not_started', 'submitted', 'in_review', 'approved', 'rejected'], default: 'not_started', index: true },

        // Payout account snapshot — riders enter this once, editable from the
        // rider app. Payout requests copy fields from here at request time.
        payoutMethod: {
            method: { type: String, enum: ['upi', 'bank', null], default: null },
            accountHolder: { type: String, default: '' },
            accountNumber: { type: String, default: '' },
            ifsc: { type: String, default: '' },
            bankName: { type: String, default: '' },
            upiId: { type: String, default: '' },
            updatedAt: { type: Date, default: null },
        },
    },
    { timestamps: true }
);

RiderSchema.index({ online: 1, available: 1 });
RiderSchema.index({ currentLocation: '2dsphere' });

export type RiderDoc = InferSchemaType<typeof RiderSchema> & { _id: any };
export const Rider = model<RiderDoc>('Rider', RiderSchema);
export default Rider;
