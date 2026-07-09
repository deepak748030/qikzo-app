const { Schema, model } = require('mongoose');

// One active OTP per phone; auto-purges via TTL index once expiresAt passes.
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

module.exports = model('Otp', OtpSchema);
