import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * RideHistory — denormalised, immutable trip summary written on completion.
 * Optimised for the customer's "past rides" and rider's "past jobs" screens
 * (Booking + Trip joined + populated in one document). Never mutate.
 */
const RideHistorySchema = new Schema(
    {
        booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true, index: true },
        trip: { type: Schema.Types.ObjectId, ref: 'Trip', default: null },
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        rider: { type: Schema.Types.ObjectId, ref: 'Rider', default: null, index: true },

        code: { type: String, required: true, index: true },
        categorySlug: { type: String, required: true },
        mode: { type: String, enum: ['ride', 'delivery'], required: true },
        pickup: {
            address: { type: String, required: true },
            lat: { type: Number, default: null },
            lng: { type: Number, default: null },
        },
        drop: {
            address: { type: String, required: true },
            lat: { type: Number, default: null },
            lng: { type: Number, default: null },
        },

        distanceKm: { type: Number, required: true },
        durationMin: { type: Number, default: 0 },
        fare: { type: Number, required: true },
        paymentMethod: { type: String, default: 'cash' },
        outcome: { type: String, enum: ['completed', 'cancelled'], required: true },

        riderName: { type: String, default: '' },
        vehicleNo: { type: String, default: '' },

        completedAt: { type: Date, required: true },
    },
    { timestamps: true }
);

RideHistorySchema.index({ user: 1, completedAt: -1 });
RideHistorySchema.index({ rider: 1, completedAt: -1 });

export type RideHistoryDoc = InferSchemaType<typeof RideHistorySchema> & { _id: any };
export const RideHistory = model<RideHistoryDoc>('RideHistory', RideHistorySchema);
export default RideHistory;
