import Rider from '../models/Rider';
import User from '../models/User';
import Booking from '../models/Booking';
import Trip from '../models/Trip';
import RideRequest from '../models/RideRequest';
import { errors } from '../lib/errors';
import { emitRiderLocation, emitNearbyRider, emitRiderOffline } from '../sockets';

/**
 * Rider domain service.
 *
 * Includes the public read-side (`listAvailable`, `nearby`, `getPublic`) used
 * by the customer app + the self-service surface consumed by the rider app.
 */
export const riderService = {
    // ---------- Public (customer app) ----------
    listAvailable: () =>
        Rider.find({ online: true, available: true }).sort({ rating: -1 }).limit(50).lean(),

    async nearby(lng: number, lat: number, radiusM = 5000, limit = 20) {
        if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
            throw errors.badRequest('Invalid coordinates', 'INVALID_COORDS');
        }
        const maxDistance = Math.min(Math.max(radiusM, 100), 25_000);
        return Rider.find({
            online: true,
            available: true,
            currentLocation: {
                $near: {
                    $geometry: { type: 'Point', coordinates: [lng, lat] },
                    $maxDistance: maxDistance,
                },
            },
        })
            .limit(Math.min(Math.max(limit, 1), 50))
            .lean();
    },

    async getPublic(id: string) {
        const r = await Rider.findById(id)
            .select('name vehicle vehicleNo rating trips online currentLocation')
            .lean();
        if (!r) throw errors.notFound('Rider not found', 'RIDER_NOT_FOUND');
        return r;
    },

    // ---------- Self-service (rider app) ----------

    /**
     * Ensure every authenticated user that identifies as a rider has exactly
     * one Rider record. Called by the `requireRider` middleware and by any
     * service that needs to resolve a rider from a user id.
     */
    async getOrCreateForUser(userId: string) {
        let rider = await Rider.findOne({ user: userId });
        if (rider) return rider;
        const user = await User.findById(userId).lean();
        rider = await Rider.create({
            user: userId,
            name: (user as any)?.name || 'Rider',
            phone: (user as any)?.phone || '',
            vehicle: 'Two-wheeler',
            vehicleNo: 'PENDING',
            online: false,
            available: true,
        });
        return rider;
    },

    async me(userId: string) {
        return this.getOrCreateForUser(userId);
    },

    async updateStatus(userId: string, patch: { online?: boolean; available?: boolean }) {
        const rider = await this.getOrCreateForUser(userId);
        // Gate: a rider can only go online once KYC is approved. This mirrors
        // the compliance requirement — no unverified rider should receive jobs.
        if (patch.online === true && (rider as any).kycStatus !== 'approved') {
            throw errors.badRequest(
                'Complete KYC verification before going online.',
                'KYC_NOT_APPROVED',
            );
        }
        const wasOnline = rider.online;
        if (patch.online !== undefined) rider.online = patch.online;
        if (patch.available !== undefined) rider.available = patch.available;
        await rider.save();
        // Fanout to customers so their map removes the marker on go-offline.
        if (wasOnline && rider.online === false) {
            try { emitRiderOffline(String(rider._id)); } catch {}
        }
        return rider;
    },

    async updateLocation(userId: string, coord: { lat: number; lng: number; heading?: number; speed?: number }) {
        const rider = await this.getOrCreateForUser(userId);
        (rider as any).currentLocation = {
            type: 'Point',
            coordinates: [coord.lng, coord.lat],
            updatedAt: new Date(),
        };
        await rider.save();

        // Fanout to all customers so their maps update the marker in real time,
        // regardless of whether this rider owns an active trip.
        if (rider.online) {
            try {
                emitNearbyRider({
                    riderId: String(rider._id),
                    vehicle: (rider as any).vehicle || '',
                    online: true,
                    lat: coord.lat,
                    lng: coord.lng,
                });
            } catch { /* ignore */ }
        }

        // Fanout to the customer if this rider currently owns an active trip.
        // Silent — never let a socket hiccup break the location write.
        try {
            const trip = await Trip.findOne({
                rider: rider._id,
                stage: { $nin: ['completed', 'cancelled'] },
            }).select('_id booking').lean();
            if (trip) {
                emitRiderLocation({
                    bookingId: String(trip.booking),
                    tripId: String(trip._id),
                    riderUserId: userId,
                    lat: coord.lat,
                    lng: coord.lng,
                    heading: coord.heading,
                    speed: coord.speed,
                    at: new Date(),
                });
            }
        } catch { /* ignore */ }

        return rider;
    },


    async updateVehicle(userId: string, patch: { vehicle: string; vehicleNo: string; vehicleTypeSlug?: string }) {
        const rider = await this.getOrCreateForUser(userId);
        rider.vehicle = patch.vehicle.trim();
        rider.vehicleNo = patch.vehicleNo.trim().toUpperCase();
        if (patch.vehicleTypeSlug) {
            (rider as any).vehicleTypeSlug = String(patch.vehicleTypeSlug).trim().toLowerCase();
        }
        await rider.save();
        return rider;
    },

    /**
     * Return open bookings (Searching rider, unassigned) near the rider's
     * current location. Filters out any that the rider has previously
     * declined via RideRequest.
     *
     * Falls back to the newest few searching bookings when the rider has no
     * fresh location yet — useful in dev/emulator so the incoming feed isn't
     * always empty.
     */
    async incoming(userId: string, opts: { radiusM?: number; limit?: number } = {}) {
        const rider = await this.getOrCreateForUser(userId);
        const declined = await RideRequest
            .find({ rider: rider._id, status: { $in: ['rejected', 'cancelled', 'expired'] } })
            .distinct('booking');

        const [lng, lat] = ((rider as any).currentLocation?.coordinates || [0, 0]) as [number, number];
        const hasLocation = Number.isFinite(lng) && Number.isFinite(lat) && (lng !== 0 || lat !== 0);
        const maxDistance = Math.min(Math.max(opts.radiusM ?? 5000, 500), 25_000);
        const limit = Math.min(Math.max(opts.limit ?? 10, 1), 25);

        const riderVehicleSlug = String((rider as any).vehicleTypeSlug || '').trim().toLowerCase();
        const baseFilter: any = {
            status: 'Searching rider',
            rider: null,
            _id: { $nin: declined },
        };
        // Match rides to the rider's registered vehicle type. A rider WITH a
        // slug sees only matching rides + untyped (delivery) bookings. A rider
        // WITHOUT a slug sees only untyped bookings — otherwise unregistered
        // riders would receive every typed ride (sedan/auto/bike) on the app.
        if (riderVehicleSlug) {
            baseFilter.$or = [
                { vehicleTypeSlug: riderVehicleSlug },
                { vehicleTypeSlug: { $in: ['', null] } },
                { vehicleTypeSlug: { $exists: false } },
            ];
        } else {
            baseFilter.$or = [
                { vehicleTypeSlug: { $in: ['', null] } },
                { vehicleTypeSlug: { $exists: false } },
            ];
        }

        if (hasLocation) {
            return Booking.find({
                ...baseFilter,
                'pickup.location': {
                    $near: {
                        $geometry: { type: 'Point', coordinates: [lng, lat] },
                        $maxDistance: maxDistance,
                    },
                },
            }).populate('user', 'name phone').limit(limit).lean();
        }

        return Booking.find(baseFilter).sort({ createdAt: -1 }).populate('user', 'name phone').limit(limit).lean();
    },

    async recordDecline(userId: string, bookingId: string, reason = '') {
        const rider = await this.getOrCreateForUser(userId);
        await RideRequest.findOneAndUpdate(
            { rider: rider._id, booking: bookingId },
            {
                rider: rider._id,
                booking: bookingId,
                status: 'rejected',
                respondedAt: new Date(),
                reason,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
    },
};

export default riderService;
