import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * LocationHistory — rider location breadcrumbs, sampled during an active
 * Trip. GeoJSON Point + 2dsphere for near-queries and heatmaps. Not written
 * for idle riders (only when they have an active Trip) to keep write volume
 * bounded.
 */
const LocationHistorySchema = new Schema(
    {
        rider: { type: Schema.Types.ObjectId, ref: 'Rider', required: true, index: true },
        trip: { type: Schema.Types.ObjectId, ref: 'Trip', default: null, index: true },
        point: {
            type: { type: String, enum: ['Point'], default: 'Point' },
            coordinates: { type: [Number], required: true }, // [lng, lat]
        },
        speedKph: { type: Number, default: null },
        bearing: { type: Number, default: null },
        at: { type: Date, default: Date.now, index: true },
    },
    { timestamps: false }
);

LocationHistorySchema.index({ point: '2dsphere' });
LocationHistorySchema.index({ rider: 1, at: -1 });

export type LocationHistoryDoc = InferSchemaType<typeof LocationHistorySchema> & { _id: any };
export const LocationHistory = model<LocationHistoryDoc>('LocationHistory', LocationHistorySchema);
export default LocationHistory;
