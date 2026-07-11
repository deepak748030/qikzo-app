import { Schema, model, type InferSchemaType } from 'mongoose';

export const KYC_STATUSES = ['not_started', 'submitted', 'in_review', 'approved', 'rejected'] as const;
export type KycStatus = (typeof KYC_STATUSES)[number];

/**
 * KYC — one row per rider, snapshot of the current KYC dossier. Individual
 * uploads live in Document (linked via `documentIds`). A rider cannot go
 * online until `status = 'approved'` (enforced at the service layer).
 */
const KYCSchema = new Schema(
    {
        rider: { type: Schema.Types.ObjectId, ref: 'Rider', required: true, unique: true, index: true },
        status: { type: String, enum: KYC_STATUSES, default: 'not_started', index: true },
        legalName: { type: String, default: '' },
        dob: { type: Date, default: null },
        aadhaarLast4: { type: String, default: '' },
        panMasked: { type: String, default: '' },
        dlNumber: { type: String, default: '' },
        dlExpiry: { type: Date, default: null },
        documentIds: [{ type: Schema.Types.ObjectId, ref: 'Document' }],
        submittedAt: { type: Date, default: null },
        reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        reviewedAt: { type: Date, default: null },
        rejectionReason: { type: String, default: '' },
    },
    { timestamps: true }
);

export type KYCDoc = InferSchemaType<typeof KYCSchema> & { _id: any };
export const KYC = model<KYCDoc>('KYC', KYCSchema);
export default KYC;
