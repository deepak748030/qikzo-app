import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * Referral — one row per referred user (the referee). Created when a new user
 * applies someone's referral code. `deliveries` is the referee's completed
 * delivery count *since joining*, and `awarded` records which milestone
 * thresholds have already paid out so we never double-credit the referrer.
 */
const ReferralSchema = new Schema(
    {
        referrer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        referee: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
        code: { type: String, required: true, index: true },
        deliveries: { type: Number, default: 0 },
        // Milestone thresholds already paid out (e.g. [100, 500]).
        awarded: { type: [Number], default: [] },
        totalEarned: { type: Number, default: 0 },
    },
    { timestamps: true }
);

ReferralSchema.index({ referrer: 1, createdAt: -1 });

export type ReferralDoc = InferSchemaType<typeof ReferralSchema> & { _id: any };
export const Referral = model<ReferralDoc>('Referral', ReferralSchema);
export default Referral;
