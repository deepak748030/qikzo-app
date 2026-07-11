import { Schema, model, type InferSchemaType } from 'mongoose';

export const TXN_TYPES = [
    'topup', 'refund', 'trip_debit', 'trip_credit', 'payout_debit', 'adjustment', 'bonus', 'penalty',
] as const;
export type TxnType = (typeof TXN_TYPES)[number];

/**
 * WalletTransaction — immutable ledger row. Never update these once written.
 * `balanceAfter` snapshots the wallet balance at write time for fast audit
 * queries and receipt generation.
 */
const WalletTransactionSchema = new Schema(
    {
        wallet: { type: Schema.Types.ObjectId, ref: 'Wallet', required: true, index: true },
        type: { type: String, enum: TXN_TYPES, required: true, index: true },
        direction: { type: String, enum: ['credit', 'debit'], required: true },
        amount: { type: Number, required: true, min: 0 },
        currency: { type: String, default: 'INR' },
        balanceAfter: { type: Number, required: true, min: 0 },

        // Optional links to originating documents.
        booking: { type: Schema.Types.ObjectId, ref: 'Booking', default: null, index: true },
        trip: { type: Schema.Types.ObjectId, ref: 'Trip', default: null },
        payment: { type: Schema.Types.ObjectId, ref: 'Payment', default: null },
        payout: { type: Schema.Types.ObjectId, ref: 'Payout', default: null },

        note: { type: String, default: '' },
        refCode: { type: String, default: '' }, // idempotency key — see uniqueness index below
        meta: { type: Schema.Types.Mixed, default: {} },
    },
    { timestamps: true }
);

WalletTransactionSchema.index({ wallet: 1, createdAt: -1 });
// Idempotency: never double-post a txn for the same external ref on the same wallet.
WalletTransactionSchema.index(
    { wallet: 1, refCode: 1 },
    { unique: true, partialFilterExpression: { refCode: { $type: 'string' } } }
);

export type WalletTransactionDoc = InferSchemaType<typeof WalletTransactionSchema> & { _id: any };
export const WalletTransaction = model<WalletTransactionDoc>('WalletTransaction', WalletTransactionSchema);
export default WalletTransaction;
