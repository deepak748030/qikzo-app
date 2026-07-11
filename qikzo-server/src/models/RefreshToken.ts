import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * Refresh tokens are stored hashed. We keep only the jti (opaque id) in the
 * signed JWT and match by (userId, jti). Rotating on every refresh call keeps
 * the blast radius of a leaked token to a single request window.
 */
const RefreshTokenSchema = new Schema(
    {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        jti: { type: String, required: true, unique: true, index: true },
        tokenHash: { type: String, required: true },
        deviceId: { type: String, default: '' },
        userAgent: { type: String, default: '' },
        ip: { type: String, default: '' },
        revokedAt: { type: Date, default: null },
        replacedByJti: { type: String, default: null },
        expiresAt: { type: Date, required: true },
    },
    { timestamps: true }
);

// TTL cleanup once expiry passes.
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
RefreshTokenSchema.index({ user: 1, revokedAt: 1 });

export type RefreshTokenDoc = InferSchemaType<typeof RefreshTokenSchema> & { _id: any };
export const RefreshToken = model<RefreshTokenDoc>('RefreshToken', RefreshTokenSchema);
export default RefreshToken;
