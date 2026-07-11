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
        // Extended profile fields (used by rider Personal Info screen). Kept
        // optional so existing users continue to validate.
        dob: { type: String, default: '' },        // DD-MM-YYYY
        gender: { type: String, enum: ['male', 'female', 'other', ''], default: '' },
        address: { type: String, default: '' },
        city: { type: String, default: '' },
        pincode: { type: String, default: '' },
        emergencyName: { type: String, default: '' },
        emergencyPhone: { type: String, default: '' },
        // Profile photo URL (relative /uploads/... path or absolute). Uploaded
        // via POST /uploads then patched onto the user via PATCH /users/me.
        avatarUrl: { type: String, default: '' },
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
