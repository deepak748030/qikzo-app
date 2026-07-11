import { Schema, model, type InferSchemaType } from 'mongoose';

const OtpSchema = new Schema(
    {
        phone: { type: String, required: true, index: true },
        codeHash: { type: String, required: true },
        attempts: { type: Number, default: 0 },
        expiresAt: { type: Date, required: true },
    },
    { timestamps: true }
);

OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type OtpDoc = InferSchemaType<typeof OtpSchema> & { _id: any };
export const Otp = model<OtpDoc>('Otp', OtpSchema);
export default Otp;
