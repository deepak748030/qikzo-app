import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * Review — bidirectional (customer rates rider, rider rates customer).
 * Unique per (booking, byUserId) so a party can only leave one review.
 */
const ReviewSchema = new Schema(
    {
        booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
        byUserId: { type: Schema.Types.ObjectId, required: true, index: true }, // author (User or Rider)
        byRole: { type: String, enum: ['customer', 'rider'], required: true },
        targetId: { type: Schema.Types.ObjectId, required: true, index: true }, // subject (Rider or User)
        rating: { type: Number, required: true, min: 1, max: 5 },
        comment: { type: String, default: '' },
        tags: [{ type: String }],
    },
    { timestamps: true }
);

ReviewSchema.index({ booking: 1, byUserId: 1 }, { unique: true });
ReviewSchema.index({ targetId: 1, createdAt: -1 });

export type ReviewDoc = InferSchemaType<typeof ReviewSchema> & { _id: any };
export const Review = model<ReviewDoc>('Review', ReviewSchema);
export default Review;
