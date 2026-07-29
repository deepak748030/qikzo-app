import { Schema, model, type InferSchemaType } from 'mongoose';

export const BOOKING_STATUSES = [
    'Scheduled',
    'Searching rider',
    'Rider accepted',
    'Arriving for pickup',
    'Picked up',
    'On the way',
    'Delivered',
    'Cancelled',
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/**
 * Point stored two ways:
 *  - `address/lat/lng` — kept for backwards-compat with existing mobile UI.
 *  - `location` GeoJSON — 2dsphere-indexed for nearby-rider dispatch.
 * On write both should be filled; on read the mobile app can keep using lat/lng.
 */
const PointSchema = new Schema(
    {
        address: { type: String, required: true, trim: true },
        lat: { type: Number, default: null },
        lng: { type: Number, default: null },
        location: {
            type: { type: String, enum: ['Point'], default: 'Point' },
            coordinates: { type: [Number], default: undefined }, // [lng, lat]
        },
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
        code: { type: String, required: true, unique: true, index: true },
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        rider: { type: Schema.Types.ObjectId, ref: 'Rider', default: null, index: true },

        mode: { type: String, enum: ['ride', 'delivery'], default: 'delivery' },
        categorySlug: { type: String, required: true, index: true },
        vehicleTypeSlug: { type: String, default: '', index: true },

        pickup: { type: PointSchema, required: true },
        // Optional intermediate pickups (Pickup 2, Pickup 3, …). Max 3 enforced
        // in the validator. Route order is pickup → extraPickups[0..n] → drop.
        extraPickups: { type: [PointSchema], default: [] },
        drop: { type: PointSchema, required: true },

        notes: { type: String, default: '' },
        // Optional attached photos of the items to be picked up. Stored as
        // absolute or /uploads-relative URLs returned by POST /uploads.
        noteImages: { type: [String], default: [] },
        recipientPhone: { type: String, default: '' },
        recipientName: { type: String, default: '' },
        payment: { type: String, enum: ['cash', 'upi'], default: 'cash' },
        // Mock payment lifecycle. UPI auto-settles on delivery; cash sits in
        // `pending` until the customer confirms in-app. `disputed` opens a
        // support flow. Real gateway integration replaces the auto-settle
        // branch later without touching this schema.
        paymentStatus: { type: String, enum: ['pending', 'paid', 'disputed'], default: 'pending', index: true },
        paymentPaidAt: { type: Date, default: null },
        paymentTxnId: { type: String, default: '' }, // mock UPI id — placeholder for real gateway ref

        distanceKm: { type: Number, required: true },
        etaMin: { type: Number, required: true },
        price: { type: Number, required: true },
        pricing: {
            base: { type: Number, required: true },
            perKm: { type: Number, required: true },
        },

        couponCode: { type: String, default: '' },
        discount: { type: Number, default: 0 },

        // Optional future pickup time. When set, the booking sits in
        // `Scheduled` status until the dispatcher wakes it up ~15 minutes
        // before scheduledAt.
        scheduledAt: { type: Date, default: null, index: true },

        status: { type: String, enum: BOOKING_STATUSES, default: 'Searching rider', index: true },
        history: { type: [StatusEventSchema], default: [] },
        cancelledReason: { type: String, default: '' },
        cancelledBy: { type: String, enum: ['customer', 'rider', 'admin', 'system'], default: null },
        cancellationFee: { type: Number, default: 0 },
        cancelledAt: { type: Date, default: null },
    },
    { timestamps: true }
);

// Query patterns:
//  - user history feed  → (user, createdAt desc)
//  - rider job history  → (rider, createdAt desc)
//  - admin dispatch/ops → (status, createdAt desc), (status, rider)
//  - geo dispatch       → 2dsphere on pickup/drop locations
BookingSchema.index({ user: 1, status: 1, createdAt: -1 });
BookingSchema.index({ user: 1, createdAt: -1 });
BookingSchema.index({ rider: 1, createdAt: -1 });
BookingSchema.index({ status: 1, createdAt: -1 });
BookingSchema.index({ status: 1, rider: 1 });
BookingSchema.index({ 'pickup.location': '2dsphere' });
BookingSchema.index({ 'drop.location': '2dsphere' });

export type BookingDoc = InferSchemaType<typeof BookingSchema> & { _id: any };
export const Booking = model<BookingDoc>('Booking', BookingSchema);
export default Booking;
