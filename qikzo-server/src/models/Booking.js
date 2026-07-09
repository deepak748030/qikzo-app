const { Schema, model } = require('mongoose');

const BOOKING_STATUSES = [
    'Searching rider',
    'Rider accepted',
    'Arriving for pickup',
    'Picked up',
    'On the way',
    'Delivered',
    'Cancelled',
];

const PointSchema = new Schema(
    {
        address: { type: String, required: true, trim: true },
        lat: { type: Number, default: null },
        lng: { type: Number, default: null },
    },
    { _id: false }
);

const StatusEventSchema = new Schema(
    {
        status: { type: String, enum: BOOKING_STATUSES, required: true },
        at: { type: Date, default: Date.now },
        note: { type: String, default: '' },
    },
    { _id: false }
);

const BookingSchema = new Schema(
    {
        code: { type: String, required: true, unique: true, index: true }, // e.g. "QZ2101"
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        rider: { type: Schema.Types.ObjectId, ref: 'Rider', default: null, index: true },

        mode: { type: String, enum: ['ride', 'delivery'], default: 'delivery' },
        categorySlug: { type: String, required: true },

        pickup: { type: PointSchema, required: true },
        drop: { type: PointSchema, required: true },

        notes: { type: String, default: '' },
        recipientPhone: { type: String, default: '' },
        payment: { type: String, enum: ['cash', 'upi'], default: 'cash' },

        distanceKm: { type: Number, required: true },
        etaMin: { type: Number, required: true },
        price: { type: Number, required: true },
        pricing: {
            base: { type: Number, required: true },
            perKm: { type: Number, required: true },
        },

        status: { type: String, enum: BOOKING_STATUSES, default: 'Searching rider', index: true },
        history: { type: [StatusEventSchema], default: [] },

        cancelledReason: { type: String, default: '' },
    },
    { timestamps: true }
);

BookingSchema.statics.STATUSES = BOOKING_STATUSES;
BookingSchema.index({ user: 1, createdAt: -1 });

module.exports = model('Booking', BookingSchema);
module.exports.BOOKING_STATUSES = BOOKING_STATUSES;
