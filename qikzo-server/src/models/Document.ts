import { Schema, model, type InferSchemaType } from 'mongoose';

export const DOCUMENT_KINDS = [
    'aadhaar_front', 'aadhaar_back', 'pan', 'dl_front', 'dl_back',
    'rc_front', 'rc_back', 'insurance', 'vehicle_photo', 'profile_photo', 'other',
] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export const DOCUMENT_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

/**
 * Document — a KYC / vehicle upload. Ownership is generic (a User or Rider);
 * discriminated by `ownerRole` so the same collection serves both apps.
 */
const DocumentSchema = new Schema(
    {
        owner: { type: Schema.Types.ObjectId, required: true, index: true },
        ownerRole: { type: String, enum: ['customer', 'rider'], required: true, index: true },
        kind: { type: String, enum: DOCUMENT_KINDS, required: true, index: true },
        url: { type: String, required: true }, // storage key/url
        mimeType: { type: String, default: '' },
        sizeBytes: { type: Number, default: 0 },
        status: { type: String, enum: DOCUMENT_STATUSES, default: 'pending', index: true },
        reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        reviewedAt: { type: Date, default: null },
        reviewNote: { type: String, default: '' },
        expiresAt: { type: Date, default: null }, // for insurance, DL, etc.
    },
    { timestamps: true }
);

DocumentSchema.index({ owner: 1, kind: 1 });

export type DocumentDoc = InferSchemaType<typeof DocumentSchema> & { _id: any };
export const Document = model<DocumentDoc>('Document', DocumentSchema);
export default Document;
