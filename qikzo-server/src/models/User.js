const { Schema, model } = require('mongoose');

const UserSchema = new Schema(
    {
        phone: { type: String, required: true, unique: true, index: true, trim: true },
        name: { type: String, default: 'Guest', trim: true },
        email: { type: String, default: '', trim: true, lowercase: true },
        onboarded: { type: Boolean, default: false },
        location: { type: String, default: null },
        lastLoginAt: { type: Date, default: null },
    },
    { timestamps: true }
);

UserSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret) => { ret.id = String(ret._id); delete ret._id; return ret; },
});

module.exports = model('User', UserSchema);
