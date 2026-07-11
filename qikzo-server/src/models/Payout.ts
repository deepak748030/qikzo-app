import { Schema, model, type InferSchemaType } from 'mongoose';

export const PAYOUT_STATUSES = ['requested', 'processing', 'paid', 'failed', 'cancelled'] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

/**
 * Payout — a rider withdrawal request. Debits the rider wallet on `paid`.
 */
const PayoutSchema = new Schema(
    {
        rider: { type: Schema.Types.ObjectId, ref: 'Rider', required: true, index: true },
        amount: { type: Number, required: true, min: 1 },
        currency: { type: String, default: 'INR' },
        status: { type: String, enum: PAYOUT_STATUSES, default: 'requested', index: true },
        method: { type: String, enum: ['upi', 'bank'], required: true },
        upiId: { type: String, default: '' },
        bank: {
            accountName: { type: String, default: '' },
            accountNo: { type: String, default: '' },
            ifsc: { type: String, default: '' },
        },
        processedAt: { type: Date, default: null },
        failureReason: { type: String, default: '' },
        providerRef: { type: String, default: '' },
    },
    { timestamps: true }
);

PayoutSchema.index({ rider: 1, createdAt: -1 });

export type PayoutDoc = InferSchemaType<typeof PayoutSchema> & { _id: any };
export const Payout = model<PayoutDoc>('Payout', PayoutSchema);
export default Payout;
