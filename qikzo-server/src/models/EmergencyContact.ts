import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * EmergencyContact — up to N per user, surfaced during the in-trip SOS flow
 * (Phase 4.7 lifecycle work). Not tied to a booking — a user's persistent
 * safety list.
 */
const EmergencyContactSchema = new Schema(
    {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        name: { type: String, required: true, trim: true },
        phone: { type: String, required: true, trim: true },
        relation: { type: String, default: '' },
        notifyOnTrip: { type: Boolean, default: true },
    },
    { timestamps: true }
);

EmergencyContactSchema.index({ user: 1, phone: 1 }, { unique: true });

export type EmergencyContactDoc = InferSchemaType<typeof EmergencyContactSchema> & { _id: any };
export const EmergencyContact = model<EmergencyContactDoc>('EmergencyContact', EmergencyContactSchema);
export default EmergencyContact;
