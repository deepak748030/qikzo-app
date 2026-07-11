import { Schema, model, type InferSchemaType } from 'mongoose';

export const TRIP_STAGES = ['assigned', 'arriving', 'arrived', 'started', 'completed', 'cancelled'] as const;
export type TripStage = (typeof TRIP_STAGES)[number];

const PathPointSchema = new Schema(
    {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
        at: { type: Date, default: Date.now },
        speedKph: { type: Number, default: null },
    },
    { _id: false }
);

/**
 * Trip — the rider-side lifecycle for an accepted Booking. One Booking has at
 * most one Trip. Stores the actual traversed path for receipts, disputes and
 * analytics. Booking keeps a status timeline; Trip keeps a path + timings.
 */
const TripSchema = new Schema(
    {
        booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true, index: true },
        rider: { type: Schema.Types.ObjectId, ref: 'Rider', required: true, index: true },
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        vehicle: { type: Schema.Types.ObjectId, ref: 'Vehicle', default: null },

        stage: { type: String, enum: TRIP_STAGES, default: 'assigned', index: true },
        assignedAt: { type: Date, default: Date.now },
        arrivingAt: { type: Date, default: null },
        arrivedAt: { type: Date, default: null },
        startedAt: { type: Date, default: null },
        completedAt: { type: Date, default: null },
        cancelledAt: { type: Date, default: null },
        cancelReason: { type: String, default: '' },

        distanceKm: { type: Number, default: 0 },
        durationMin: { type: Number, default: 0 },
        fare: { type: Number, default: 0 },
        path: { type: [PathPointSchema], default: [] },
    },
    { timestamps: true }
);

TripSchema.index({ rider: 1, stage: 1 });
TripSchema.index({ user: 1, createdAt: -1 });

export type TripDoc = InferSchemaType<typeof TripSchema> & { _id: any };
export const Trip = model<TripDoc>('Trip', TripSchema);
export default Trip;
