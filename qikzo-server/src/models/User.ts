import { Schema, model, type InferSchemaType, type Model } from 'mongoose';

const UserSchema = new Schema(
    {
        phone: { type: String, required: true, unique: true, index: true, trim: true },
        name: { type: String, default: 'Guest', trim: true },
        email: { type: String, default: '', trim: true, lowercase: true },
        onboarded: { type: Boolean, default: false },
        location: { type: String, default: null },
        // Role is authoritative — never trust it from a JWT alone; re-check on
        // sensitive routes. `customer` covers app users; riders live in their
        // own collection but we still tag their linked user for auth flows.
        role: { type: String, enum: ['customer', 'rider', 'admin'], default: 'customer', index: true },
        blocked: { type: Boolean, default: false, index: true },
        blockedReason: { type: String, default: '' },
        lastLoginAt: { type: Date, default: null },
    },
    { timestamps: true }
);

UserSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret: any) => { ret.id = String(ret._id); delete ret._id; return ret; },
});

export type UserDoc = InferSchemaType<typeof UserSchema> & { _id: any };
export const User: Model<UserDoc> = model<UserDoc>('User', UserSchema);
export default User;
