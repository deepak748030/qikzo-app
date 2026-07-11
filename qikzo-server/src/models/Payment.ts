import { Schema, model, type InferSchemaType } from 'mongoose';

export const PAYMENT_STATUSES = ['created', 'authorized', 'captured', 'failed', 'refunded', 'cancelled'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/**
 * Payment — a single money-in attempt from a user (cash marker, UPI, card,
 * wallet topup). Provider fields are optional now (ledger-only per AUDIT
 * defaults) but scaffolded so Razorpay/Stripe integration is a drop-in.
 */
const PaymentSchema = new Schema(
    {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        booking: { type: Schema.Types.ObjectId, ref: 'Booking', default: null, index: true },

        method: { type: String, enum: ['cash', 'upi', 'card', 'wallet', 'netbanking'], required: true },
        provider: { type: String, default: 'internal' }, // razorpay | stripe | cashfree | internal
        providerOrderId: { type: String, default: '' },
        providerPaymentId: { type: String, default: '' },
        providerSignature: { type: String, default: '' },

        amount: { type: Number, required: true, min: 0 },
        currency: { type: String, default: 'INR' },
        status: { type: String, enum: PAYMENT_STATUSES, default: 'created', index: true },
        failureReason: { type: String, default: '' },
        capturedAt: { type: Date, default: null },
        refundedAt: { type: Date, default: null },
        meta: { type: Schema.Types.Mixed, default: {} },
    },
    { timestamps: true }
);

PaymentSchema.index({ user: 1, createdAt: -1 });
PaymentSchema.index(
    { providerPaymentId: 1 },
    { unique: true, partialFilterExpression: { providerPaymentId: { $type: 'string' } } }
);

export type PaymentDoc = InferSchemaType<typeof PaymentSchema> & { _id: any };
export const Payment = model<PaymentDoc>('Payment', PaymentSchema);
export default Payment;
