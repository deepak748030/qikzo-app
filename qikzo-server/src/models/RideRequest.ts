import { Schema, model, type InferSchemaType } from 'mongoose';

export const RIDE_REQUEST_STATUSES = ['pending', 'accepted', 'rejected', 'expired', 'cancelled'] as const;
export type RideRequestStatus = (typeof RIDE_REQUEST_STATUSES)[number];

/**
 * RideRequest — one offer of a booking to a specific rider (dispatch layer).
 * Multiple RideRequests may fan out for a single Booking during the search
 * window; the first `accepted` wins, the rest get marked `cancelled`.
 * Auto-purged by TTL when `expiresAt` passes.
 */
const RideRequestSchema = new Schema(
    {
        booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
        rider: { type: Schema.Types.ObjectId, ref: 'Rider', required: true, index: true },
        status: { type: String, enum: RIDE_REQUEST_STATUSES, default: 'pending', index: true },
        offeredAt: { type: Date, default: Date.now },
        respondedAt: { type: Date, default: null },
        reason: { type: String, default: '' }, // reject reason
        distanceKm: { type: Number, default: 0 }, // distance from rider to pickup at offer time
        etaMin: { type: Number, default: 0 },
        expiresAt: { type: Date, required: true },
    },
    { timestamps: true }
);

RideRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
RideRequestSchema.index({ booking: 1, rider: 1 }, { unique: true });
RideRequestSchema.index({ rider: 1, status: 1, offeredAt: -1 });

export type RideRequestDoc = InferSchemaType<typeof RideRequestSchema> & { _id: any };
export const RideRequest = model<RideRequestDoc>('RideRequest', RideRequestSchema);
export default RideRequest;
