import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * Wallet — one per (owner, kind). `kind = 'customer'` for user-facing balance
 * (credits, refunds), `kind = 'rider'` for rider earnings. All balance changes
 * flow through `WalletTransaction` (double-entry style: never mutate `balance`
 * without a matching txn).
 */
const WalletSchema = new Schema(
    {
        owner: { type: Schema.Types.ObjectId, required: true, index: true }, // User or Rider _id
        kind: { type: String, enum: ['customer', 'rider'], required: true, index: true },
        currency: { type: String, default: 'INR' },
        balance: { type: Number, default: 0, min: 0 },
        pending: { type: Number, default: 0 }, // holds (e.g., unsettled trips)
        totalEarned: { type: Number, default: 0 }, // rider-only lifetime credit
        totalSpent: { type: Number, default: 0 }, // customer-only lifetime debit
        active: { type: Boolean, default: true },
    },
    { timestamps: true }
);

WalletSchema.index({ owner: 1, kind: 1 }, { unique: true });

export type WalletDoc = InferSchemaType<typeof WalletSchema> & { _id: any };
export const Wallet = model<WalletDoc>('Wallet', WalletSchema);
export default Wallet;
