import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * Rating — one row per completed booking. A booking can be rated at most once
 * (unique index on `booking`). Ratings roll up onto Rider.rating via
 * ratingService.
 */
const RatingSchema = new Schema(
    {
        booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true, index: true },
        trip: { type: Schema.Types.ObjectId, ref: 'Trip', required: true, index: true },
        rider: { type: Schema.Types.ObjectId, ref: 'Rider', required: true, index: true },
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        stars: { type: Number, required: true, min: 1, max: 5 },
        comment: { type: String, default: '', maxlength: 500 },
        tags: [{ type: String }],
    },
    { timestamps: true },
);

RatingSchema.index({ rider: 1, createdAt: -1 });

export type RatingDoc = InferSchemaType<typeof RatingSchema> & { _id: any };
export const Rating = model<RatingDoc>('Rating', RatingSchema);
export default Rating;
