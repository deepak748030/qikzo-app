import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * Device — one row per (user, expo push token). Used for push fanout and to
 * revoke a session on a lost/rooted device. Compound-unique so re-registering
 * the same token for the same user is idempotent.
 */
const DeviceSchema = new Schema(
    {
        user: { type: Schema.Types.ObjectId, required: true, index: true },
        audience: { type: String, enum: ['customer', 'rider'], default: 'customer', index: true },
        token: { type: String, required: true }, // Expo push token
        platform: { type: String, enum: ['ios', 'android', 'web'], required: true },
        model: { type: String, default: '' },
        appVersion: { type: String, default: '' },
        lastSeenAt: { type: Date, default: Date.now },
        revokedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

DeviceSchema.index({ user: 1, token: 1 }, { unique: true });
DeviceSchema.index({ token: 1 });

export type DeviceDoc = InferSchemaType<typeof DeviceSchema> & { _id: any };
export const Device = model<DeviceDoc>('Device', DeviceSchema);
export default Device;
