import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * AuditLog — append-only record of privileged/admin actions and other
 * security-relevant events. Used for analytics + forensic review. Never mutate
 * these rows; add new ones for corrections.
 */
const AuditLogSchema = new Schema(
    {
        actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
        actorRole: { type: String, enum: ['customer', 'rider', 'admin', 'system'], default: 'system', index: true },
        action: { type: String, required: true, index: true }, // e.g. 'kyc.approve'
        targetType: { type: String, default: '' },             // e.g. 'rider', 'payout'
        targetId: { type: Schema.Types.ObjectId, default: null, index: true },
        meta: { type: Schema.Types.Mixed, default: {} },
        ip: { type: String, default: '' },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

AuditLogSchema.index({ createdAt: -1 });

export type AuditLogDoc = InferSchemaType<typeof AuditLogSchema> & { _id: any };
export const AuditLog = model<AuditLogDoc>('AuditLog', AuditLogSchema);
export default AuditLog;
