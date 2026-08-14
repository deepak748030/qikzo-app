import crypto from 'crypto';
import Trip, { TRIP_STAGES, type TripStage } from '../models/Trip';
import Booking, { type BookingStatus } from '../models/Booking';
import Rider from '../models/Rider';
import RideRequest from '../models/RideRequest';
import { errors } from '../lib/errors';
import { emitBookingUpdate, emitTripUpdate, emitJobCancelled } from '../sockets';
import notificationService from './notificationService';
import riderService from './riderService';

/**
 * Trip service — read-side for the customer app and write-side (rider
 * lifecycle mutations) for the rider app.
 *
 * Stage machine (forward-only):
 *   assigned → arriving → arrived → started → completed
 *   (any of the above) → cancelled
 */
const STAGE_ORDER: TripStage[] = ['assigned', 'arriving', 'arrived', 'started', 'completed'];

// Mirror trip stage onto the customer-facing Booking.status string so the
// existing customer polling logic keeps working without new fields.
// NOTE: `started` maps to 'On the way' — the trip is physically underway
// once the rider picks the order up. The intermediate 'Picked up' step is
// still recorded in booking.history below so the customer timeline shows
// both milestones as done. Delivery handover is verified by a 4-digit
// delivery OTP: the customer app shows it once the order is picked up and
// the rider must submit it to move the trip to 'completed'.
const BOOKING_STATUS_FOR_STAGE: Record<TripStage, BookingStatus | null> = {
    assigned: 'Rider accepted',
    arriving: 'Arriving for pickup',
    arrived: 'Arriving for pickup',
    started: 'On the way',
    completed: 'Delivered',
    cancelled: 'Cancelled',
};

export const tripService = {
    // ---------- Read-side (customer AND rider) ----------
    // Both apps hit these. Riders own trips via `Trip.rider`; customers own
    // them via `Trip.user`. We resolve both so a single endpoint works.
    async _ownershipFilter(userId: string) {
        // Static Rider import (top of file) — avoids the dynamic import cost
        // on every request. This runs on nearly every trip read.
        const rider = await Rider.findOne({ user: userId }).select('_id').lean();
        const or: any[] = [{ user: userId }];
        if (rider?._id) or.push({ rider: rider._id });
        return { $or: or };
    },

    // Slim projections — trip/booking documents carry a lot of internals
    // (history, pricing breakdown, coupon/cancel metadata, GeoJSON sub-docs)
    // that neither the rider app nor the customer app renders. Trimming
    // them here cuts per-response payload ~55-70%.
    // The delivery OTP is a customer-only secret: it is stripped from any
    // response going to the rider so the rider can never complete a delivery
    // without physically asking the customer for the code.
    _stripOtpForRider<T extends { user?: any; deliveryOtp?: string } | null>(trip: T, userId: string): T {
        if (trip && String((trip as any).user) !== String(userId)) {
            delete (trip as any).deliveryOtp;
        }
        return trip;
    },

    // Mutation responses go back to the RIDER — populate the refs and strip
    // the delivery OTP from the serialized payload unconditionally.
    async _riderSafe(trip: any) {
        await trip.populate([{ path: 'rider' }, { path: 'booking', populate: { path: 'user', select: 'name phone' } }]);
        const obj = trip.toObject({ virtuals: true });
        delete obj.deliveryOtp;
        return obj;
    },

    async listMine(userId: string, limit = 50, offset = 0) {
        const filter = await this._ownershipFilter(userId);
        const trips = await Trip.find(filter)
            .sort({ createdAt: -1 })
            .skip(Math.max(offset, 0))
            .limit(Math.min(Math.max(limit, 1), 100))
            .select('booking rider user stage distanceKm fare deliveryOtp createdAt updatedAt')
            .populate({ path: 'rider', select: 'name vehicle vehicleNo rating trips phone' })
            .populate({
                path: 'booking',
                select: 'code mode categorySlug pickup.address pickup.lat pickup.lng extraPickups.address extraPickups.lat extraPickups.lng drop.address drop.lat drop.lng notes recipientPhone payment distanceKm etaMin price status createdAt',
                populate: { path: 'user', select: 'name phone' },
            })
            .lean();
        return trips.map((t) => this._stripOtpForRider(t as any, userId));
    },

    async getMine(userId: string, id: string) {
        const filter = await this._ownershipFilter(userId);
        const trip = await Trip.findOne({ _id: id, ...filter })
            .populate({ path: 'rider', select: 'name vehicle vehicleNo rating trips phone currentLocation.coordinates' })
            .populate({
                path: 'booking',
                select: '-history -pickup.location -drop.location',
                populate: { path: 'user', select: 'name phone' },
            })
            .lean();
        if (!trip) throw errors.notFound('Trip not found', 'TRIP_NOT_FOUND');
        return this._stripOtpForRider(trip as any, userId);
    },

    async getActive(userId: string) {
        const rider = await Rider.findOne({ user: userId }).select('_id').lean();
        const or: any[] = [{ user: userId }];
        if (rider?._id) or.push({ rider: rider._id });
        const trip = await Trip.findOne({
            $or: or,
            stage: { $in: ['assigned', 'arriving', 'arrived', 'started'] },
        })
            .sort({ createdAt: -1 })
            .populate({ path: 'rider', select: 'name vehicle vehicleNo rating trips phone currentLocation.coordinates' })
            .populate({
                path: 'booking',
                select: '-history -pickup.location -drop.location',
                populate: { path: 'user', select: 'name phone' },
            })
            .lean();
        return this._stripOtpForRider(trip as any, userId);
    },

    async getByBooking(userId: string, bookingId: string) {
        return Trip.findOne({ user: userId, booking: bookingId })
            .populate({ path: 'rider', select: 'name vehicle vehicleNo rating trips phone currentLocation.coordinates' })
            .lean();
    },

    // ---------- Rider write-side ----------

    /**
     * Rider claims an unassigned booking. Atomic-ish check on booking.rider so
     * two riders can't both accept the same booking in a race.
     */
    async acceptBooking(userIdOfRider: string, bookingId: string) {
        const rider = await riderService.getOrCreateForUser(userIdOfRider);
        // Guard: rider can only hold one active trip.
        const existingActive = await Trip.findOne({
            rider: rider._id,
            stage: { $in: ['assigned', 'arriving', 'arrived', 'started'] },
        });
        if (existingActive) {
            throw errors.conflict('You already have an active trip', 'RIDER_HAS_ACTIVE_TRIP');
        }

        const booking = await Booking.findOneAndUpdate(
            { _id: bookingId, rider: null, status: 'Searching rider' },
            {
                rider: rider._id,
                status: 'Rider accepted',
                $push: { history: { status: 'Rider accepted', note: `Accepted by ${rider.name}` } },
            },
            { new: true }
        );
        if (!booking) throw errors.conflict('Booking is no longer available', 'BOOKING_UNAVAILABLE');

        rider.available = false;
        await rider.save();

        // Delivery OTP — generated once per trip, shown only to the customer.
        // The rider must read it back at drop-off to complete the trip.
        // Ride-mode bookings have no handover, so no OTP is issued.
        const deliveryOtp = (booking as any).mode === 'ride'
            ? ''
            : String(crypto.randomInt(1000, 10000));

        const trip = await Trip.create({
            booking: booking._id,
            rider: rider._id,
            user: booking.user,
            stage: 'assigned',
            distanceKm: booking.distanceKm,
            fare: booking.price,
            deliveryOtp,
        });

        // Close any outstanding RideRequests for this booking.
        await RideRequest.updateMany(
            { booking: booking._id, status: 'pending' },
            { status: 'cancelled', respondedAt: new Date() }
        );
        // Mark this rider's ride-request record as accepted (upsert).
        await RideRequest.findOneAndUpdate(
            { rider: rider._id, booking: booking._id },
            {
                rider: rider._id,
                booking: booking._id,
                status: 'accepted',
                respondedAt: new Date(),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        emitBookingUpdate(booking);
        emitTripUpdate(trip);
        emitJobCancelled(String(booking._id));

        // Notify the customer that a rider has been assigned.
        void notificationService.emit({
            user: String(booking.user),
            audience: 'customer',
            topic: 'booking',
            title: 'Rider assigned',
            body: `${rider.name} is on the way for booking ${booking.code}.`,
            data: { bookingId: String(booking._id), tripId: String(trip._id), event: 'trip:assigned' },
        }).catch(() => {});
        return this._riderSafe(trip);
    },

    async declineBooking(userIdOfRider: string, bookingId: string, reason = '') {
        await riderService.recordDecline(userIdOfRider, bookingId, reason);
    },

    /**
     * Move an owned trip forward. Only forward transitions are allowed; the
     * booking status is mirrored and both sockets are notified.
     */
    async setStage(userIdOfRider: string, tripId: string, nextStage: TripStage, otp?: string) {
        if (!TRIP_STAGES.includes(nextStage)) {
            throw errors.badRequest('Invalid stage', 'INVALID_STAGE');
        }
        const rider = await riderService.getOrCreateForUser(userIdOfRider);
        const trip = await Trip.findOne({ _id: tripId, rider: rider._id });
        if (!trip) throw errors.notFound('Trip not found', 'TRIP_NOT_FOUND');
        if (trip.stage === 'completed' || trip.stage === 'cancelled') {
            throw errors.badRequest(`Trip is already ${trip.stage}`, 'TRIP_TERMINAL');
        }
        const currentIdx = STAGE_ORDER.indexOf(trip.stage);
        const nextIdx = STAGE_ORDER.indexOf(nextStage);
        if (nextIdx <= currentIdx) {
            throw errors.badRequest('Trips can only move forward', 'STAGE_NOT_FORWARD');
        }

        // Backfill: older delivery trips (created before the OTP feature)
        // have no code yet. Generate one on any pre-completion stage move so
        // the customer sees it in-app before the rider reaches drop-off.
        if (nextStage !== 'completed' && !(trip as any).deliveryOtp) {
            const bk = await Booking.findById(trip.booking).select('mode').lean();
            if (bk && (bk as any).mode !== 'ride') {
                (trip as any).deliveryOtp = String(crypto.randomInt(1000, 10000));
            }
        }

        // Delivery OTP gate — a delivery trip can only be completed when the
        // rider submits the 4-digit code the customer sees in their app.
        // Ride-mode trips (no handover) carry no OTP and skip this check.
        if (nextStage === 'completed') {
            if (!(trip as any).deliveryOtp) {
                // Legacy delivery trip with no code yet — mint one now, push
                // it to the customer (trip:update triggers a refetch), and
                // make the rider ask for it. Rides complete without OTP.
                const bk = await Booking.findById(trip.booking).select('mode').lean();
                if (bk && (bk as any).mode !== 'ride') {
                    (trip as any).deliveryOtp = String(crypto.randomInt(1000, 10000));
                    await trip.save();
                    emitTripUpdate(trip);
                    throw errors.badRequest('Delivery OTP is required to complete this trip', 'DELIVERY_OTP_REQUIRED');
                }
            } else {
                const given = String(otp ?? '').trim();
                if (!given) {
                    throw errors.badRequest('Delivery OTP is required to complete this trip', 'DELIVERY_OTP_REQUIRED');
                }
                if (given !== String((trip as any).deliveryOtp)) {
                    throw errors.badRequest('Incorrect delivery OTP', 'DELIVERY_OTP_INVALID');
                }
            }
        }

        trip.stage = nextStage;
        const now = new Date();
        if (nextStage === 'arriving') trip.arrivingAt = now;
        if (nextStage === 'arrived') trip.arrivedAt = now;
        if (nextStage === 'started') trip.startedAt = now;
        if (nextStage === 'completed') trip.completedAt = now;
        await trip.save();

        const bookingStatus = BOOKING_STATUS_FOR_STAGE[nextStage];
        if (bookingStatus) {
            const booking = await Booking.findById(trip.booking);
            if (booking) {
                // When the rider picks the order up we jump straight to
                // 'On the way'. Record the intermediate 'Picked up' beat in
                // history so the customer timeline shows both steps as done.
                if (nextStage === 'started') {
                    (booking.history as any).push({ status: 'Picked up' });
                }
                booking.status = bookingStatus;
                (booking.history as any).push({ status: bookingStatus });

                // Mock payment settlement on delivery:
                //  - UPI: auto-settle instantly (real gateway integration
                //    replaces this with a webhook confirmation).
                //  - Cash: leave as 'pending' — customer confirms in-app.
                if (nextStage === 'completed' && (booking as any).paymentStatus === 'pending') {
                    if ((booking as any).payment === 'upi') {
                        (booking as any).paymentStatus = 'paid';
                        (booking as any).paymentPaidAt = new Date();
                        (booking as any).paymentTxnId = `MOCK-UPI-${Date.now()}`;
                    }
                }
                await booking.save();
                emitBookingUpdate(booking);
            }
        }

        if (nextStage === 'completed') {
            rider.available = true;
            rider.trips = (rider.trips || 0) + 1;
            await rider.save();

            // Refer & Earn: count this delivery for both sides of the platform —
            // the customer's referrer and the rider's referrer — and pay out any
            // milestone just crossed. Never blocks the trip.
            const rewardService = (await import('./rewardService')).default;
            const b = await Booking.findById(trip.booking).select('user').lean();
            if (b) void rewardService.onDeliveryCompleted(String(b.user)).catch(() => {});
            if ((rider as any).user) {
                void rewardService.onDeliveryCompleted(String((rider as any).user)).catch(() => {});
            }
        }

        emitTripUpdate(trip);

        // Push customer-facing update on meaningful transitions only.
        const NOTIF_FOR_STAGE: Partial<Record<TripStage, { title: string; body: string }>> = {
            arrived: { title: 'Rider arrived', body: 'Your rider is at the pickup location.' },
            started: { title: 'Order picked up', body: 'Your order is on the way.' },
            completed: { title: 'Delivered', body: 'Your order has been delivered. Enjoy!' },
        };
        const notif = NOTIF_FOR_STAGE[nextStage];
        if (notif) {
            // Only load the booking (and only the user field) when we actually
            // need to notify — cuts one round-trip on 'assigned' + 'arriving'.
            const b = await Booking.findById(trip.booking).select('user').lean();
            if (b) {
                void notificationService.emit({
                    user: String(b.user),
                    audience: 'customer',
                    topic: nextStage === 'completed' ? 'trip' : 'booking',
                    title: notif.title,
                    body: notif.body,
                    data: { bookingId: String(trip.booking), tripId: String(trip._id), stage: nextStage },
                }).catch(() => {});
            }
        }
        return this._riderSafe(trip);
    },

    async cancelByRider(userIdOfRider: string, tripId: string, reason = '') {
        const rider = await riderService.getOrCreateForUser(userIdOfRider);
        const trip = await Trip.findOne({ _id: tripId, rider: rider._id });
        if (!trip) throw errors.notFound('Trip not found', 'TRIP_NOT_FOUND');
        if (trip.stage === 'completed' || trip.stage === 'cancelled') {
            throw errors.badRequest(`Trip is already ${trip.stage}`, 'TRIP_TERMINAL');
        }
        trip.stage = 'cancelled';
        trip.cancelledAt = new Date();
        trip.cancelReason = String(reason || '').trim();
        await trip.save();

        const booking = await Booking.findById(trip.booking);
        if (booking && booking.status !== 'Cancelled' && booking.status !== 'Delivered') {
            booking.status = 'Cancelled';
            booking.cancelledReason = trip.cancelReason;
            (booking.history as any).push({ status: 'Cancelled', note: trip.cancelReason });
            await booking.save();
            emitBookingUpdate(booking);
        }

        rider.available = true;
        await rider.save();

        emitTripUpdate(trip);

        if (booking) {
            void notificationService.emit({
                user: String(booking.user),
                audience: 'customer',
                topic: 'booking',
                title: 'Trip cancelled',
                body: trip.cancelReason || 'Your rider cancelled the trip.',
                data: { bookingId: String(trip.booking), tripId: String(trip._id), event: 'trip:cancelled' },
            }).catch(() => {});
        }
        return this._riderSafe(trip);
    },
};

export default tripService;
