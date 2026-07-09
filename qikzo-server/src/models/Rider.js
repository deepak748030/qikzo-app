const { Schema, model } = require('mongoose');

const RiderSchema = new Schema(
    {
        name: { type: String, required: true, trim: true },
        phone: { type: String, default: '', trim: true },
        vehicle: { type: String, required: true },
        vehicleNo: { type: String, required: true, uppercase: true, trim: true },
        rating: { type: Number, default: 5, min: 0, max: 5 },
        trips: { type: Number, default: 0 },
        online: { type: Boolean, default: true },
        available: { type: Boolean, default: true },
    },
    { timestamps: true }
);

RiderSchema.index({ online: 1, available: 1 });

module.exports = model('Rider', RiderSchema);
