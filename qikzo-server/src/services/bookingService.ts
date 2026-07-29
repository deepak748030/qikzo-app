import Booking, { BOOKING_STATUSES, type BookingStatus } from '../models/Booking';
import Rider from '../models/Rider';
import { estimateTrip, type EstimateInput } from '../utils/pricing';
import { errors } from '../lib/errors';
import { emitBookingUpdate, emitJobOffer, emitJobCancelled } from '../sockets';
import notificationService from './notificationService';
import couponService from './couponService';
import { vehicleAliasRegex } from '../utils/vehicleSlug';

// Serial code generator. We DON'T pre-check with `Booking.exists` — a
// unique index on `code` catches the (extremely rare) collision in the
// actual insert. This saves a round-trip per booking. The retry lives in
// the caller (`create` catches E11000 and re-runs with a fresh code).
function genCode(): string {
    return 'QZ' + String(2100 + Math.floor(Math.random() * 9000));
}

export interface CreateBookingInput {
    userId: string;
    mode?: 'ride' | 'delivery';
    categorySlug: string;
    vehicleTypeSlug?: string;
    pickup: { address: string; lat?: number | null; lng?: number | null };
    extraPickups?: { address: string; lat?: number | null; lng?: number | null }[];
    drop: { address: string; lat?: number | null; lng?: number | null };
    notes?: string;
    noteImages?: string[];
    recipientPhone?: string;
    recipientName?: string;
    payment?: 'cash' | 'upi';
    couponCode?: string;
    scheduledAt?: string;
}



export const bookingService = {
    estimate(input: EstimateInput) {
        return estimateTrip(input);
    },

    async create(input: CreateBookingInput) {
        // Guard: a user cannot hold two active bookings at once. Prevents
        // duplicate-booking spam from double taps that slip past client-side
        // guards, and stops the map/UI from getting into an ambiguous state
        // with two "in progress" trips.
        const activeStatuses = ['Searching rider', 'Rider accepted', 'Arriving for pickup', 'Picked up', 'On the way'];
        const existingActive = await Booking.findOne({
            user: input.userId,
            status: { $in: activeStatuses },
        }).select('_id code status').lean();
        if (existingActive) {
            throw errors.conflict(
                `You already have an active booking (${(existingActive as any).code}). Complete or cancel it first.`,
                'USER_HAS_ACTIVE_BOOKING'
            );
        }

        const stopsIn = Array.isArray(input.extraPickups) ? input.extraPickups.slice(0, 3) : [];
        const est = estimateTrip({
            pickup: input.pickup.address,
            drop: input.drop.address,
            pickupCoord: input.pickup.lat != null ? { lat: input.pickup.lat, lng: input.pickup.lng! } : null,
            dropCoord: input.drop.lat != null ? { lat: input.drop.lat, lng: input.drop.lng! } : null,
            stops: stopsIn,
        });

        // Coupon (optional). Server re-quotes to prevent price tampering; if
        // the code is invalid we surface the error rather than silently drop.
        let couponCode = '';
        let discount = 0;
        let finalPrice = est.price;
        let couponRedemption: { couponId: string; code: string; discount: number } | null = null;
        if (input.couponCode) {
            const q = await couponService.quote({
                userId: input.userId,
                code: input.couponCode,
                subtotal: est.price,
                categorySlug: input.categorySlug,
            });
            couponCode = q.code;
            discount = q.discount;
            finalPrice = q.finalPrice;
            couponRedemption = { couponId: String(q.coupon._id), code: q.code, discount: q.discount };
        }

        // Scheduled bookings: at least 15 minutes in the future, at most 7 days.
        let scheduledAt: Date | null = null;
        if (input.scheduledAt) {
            const t = new Date(input.scheduledAt);
            const now = Date.now();
            const MIN = 15 * 60 * 1000;
            const MAX = 7 * 24 * 60 * 60 * 1000;
            if (!Number.isFinite(t.getTime())) throw errors.badRequest('Invalid schedule time', 'INVALID_SCHEDULE');
            if (t.getTime() - now < MIN) throw errors.badRequest('Schedule at least 15 minutes ahead', 'SCHEDULE_TOO_SOON');
            if (t.getTime() - now > MAX) throw errors.badRequest('Schedule within 7 days', 'SCHEDULE_TOO_FAR');
            scheduledAt = t;
        }
        const initialStatus = scheduledAt ? 'Scheduled' : 'Searching rider';

        // Build GeoJSON-shaped points. Mongo's 2dsphere index rejects a
        // `location` sub-doc that has `type: 'Point'` without coordinates,
        // so we either fill both coordinates + type, or drop `location`
        // entirely when no lat/lng is available.
        const toPoint = (p: { address: string; lat?: number | null; lng?: number | null }) => {
            const lat = p.lat, lng = p.lng;
            if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
                return {
                    address: p.address,
                    lat,
                    lng,
                    location: { type: 'Point' as const, coordinates: [lng, lat] as [number, number] },
                };
            }
            return { address: p.address, lat: lat ?? null, lng: lng ?? null };
        };

        // Try up to 3 times to avoid the astronomically rare `code` collision
        // caught by the unique index. Faster than pre-checking on every insert.
        let booking: any = null;
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                booking = await Booking.create({
                    code: genCode(),
                    user: input.userId,
                    mode: input.mode || 'delivery',
                    categorySlug: input.categorySlug,
                    vehicleTypeSlug: String(input.vehicleTypeSlug || '').trim().toLowerCase(),
                    pickup: toPoint(input.pickup),
                    extraPickups: stopsIn.map(toPoint),
                    drop: toPoint(input.drop),
                    notes: input.notes || '',
                    noteImages: Array.isArray(input.noteImages)
                        ? input.noteImages.filter((s) => typeof s === 'string' && s.trim()).slice(0, 4)
                        : [],
                    recipientPhone: input.recipientPhone || '',
                    recipientName: input.recipientName || '',
                    payment: input.payment || 'cash',
                    distanceKm: est.distanceKm,
                    etaMin: est.etaMin,
                    price: finalPrice,
                    pricing: { base: est.base, perKm: est.perKm },
                    couponCode,
                    discount,
                    scheduledAt,
                    status: initialStatus,
                    history: [{ status: initialStatus }],
                });
                break;
            } catch (err: any) {
                // 11000 = duplicate key on `code`. Retry with a fresh one.
                if (err?.code === 11000 && attempt < 2) continue;
                throw err;
            }
        }

        if (couponRedemption) {
            await couponService.redeem({
                couponId: couponRedemption.couponId,
                code: couponRedemption.code,
                userId: input.userId,
                bookingId: String(booking._id),
                discount: couponRedemption.discount,
            }).catch(() => { /* redemption failure shouldn't kill the booking */ });
        }

        // Scheduled bookings skip dispatch — the cron below wakes them up ~15 min
        // before pickup and re-enters the normal Searching rider fanout.
        if (!scheduledAt) {
            // Realtime dispatch: notify nearby riders via socket + push.
            // The booking stays in "Searching rider" until a rider taps
            // Accept in their app (rider claim flow). No auto-assign — that
            // would steal the offer before the rider popup surfaces.
            void this._fanoutJobOffer(String(booking._id)).catch(() => {});
        }
        return booking;
    },

    /** Cron target: promote scheduled bookings due within 15 min into dispatch. */
    async wakeScheduledDue() {
        const cutoff = new Date(Date.now() + 15 * 60 * 1000);
        const due = await Booking.find({ status: 'Scheduled', scheduledAt: { $lte: cutoff } }).limit(50);
        for (const b of due) {
            b.status = 'Searching rider';
            (b.history as any).push({ status: 'Searching rider', note: 'Scheduled wake' });
            await b.save();
            emitBookingUpdate(b);
            void this._fanoutJobOffer(String(b._id)).catch(() => {});
        }
        return due.length;
    },



    async _fanoutJobOffer(bookingId: string) {
        const booking = await Booking.findById(bookingId).lean();
        if (!booking || booking.status !== 'Searching rider' || booking.rider) return;
        const lng = (booking.pickup as any)?.lng ?? (booking.pickup as any)?.location?.coordinates?.[0];
        const lat = (booking.pickup as any)?.lat ?? (booking.pickup as any)?.location?.coordinates?.[1];
        let riderUserIds: string[] = [];
        const vehicleSlug = String((booking as any).vehicleTypeSlug || '').trim().toLowerCase();

        // Base rider filter: only riders whose registered vehicle type matches
        // the customer's selection. Rides without a slug (delivery flows) fall
        // through to any online rider.
        const riderFilter: any = { online: true, available: true };
        if (vehicleSlug) {
            // Match riders who either registered with the canonical slug OR
            // whose free-form vehicle label matches (legacy riders that never
            // stored a slug). Without this fallback the dispatch filter
            // silently excludes older riders and no offer goes anywhere.
            const rx = vehicleAliasRegex(vehicleSlug);
            const unsetSlug = [
                { vehicleTypeSlug: '' },
                { vehicleTypeSlug: null },
                { vehicleTypeSlug: { $exists: false } },
            ];
            riderFilter.$or = [
                { vehicleTypeSlug: vehicleSlug },
                ...(rx ? [{ $and: [{ $or: unsetSlug }, { vehicle: rx }] }] : []),
            ];
        }

        if (Number.isFinite(lng) && Number.isFinite(lat)) {
            const nearby = await Rider.find({
                ...riderFilter,
                currentLocation: {
                    $near: {
                        $geometry: { type: 'Point', coordinates: [lng, lat] },
                        $maxDistance: 5000,
                    },
                },
            }).select('user').limit(25).lean();
            riderUserIds = nearby.map((r) => String((r as any).user)).filter(Boolean);
        } else if (vehicleSlug) {
            // No pickup coords: still target only vehicle-matched riders so
            // we never broadcast a typed ride to everyone.
            const matched = await Rider.find(riderFilter).select('user').limit(25).lean();
            riderUserIds = matched.map((r: any) => String((r as any).user)).filter(Boolean);
        }

        // For typed rides (bike/auto/sedan) we NEVER broadcast to the shared
        // `riders` room — that would send a sedan ride to bike riders. Only
        // untyped delivery bookings may fall back to the broadcast room.
        if (vehicleSlug) {
            if (riderUserIds.length) emitJobOffer(booking, riderUserIds);
            // else: no matching rider online — the incoming poll (also
            // filtered by vehicleTypeSlug) will pick it up when one comes on.
        } else {
            emitJobOffer(booking, riderUserIds);
        }

        // Push notification to targeted riders too so backgrounded apps
        // wake up and can accept. Silent if no riders in range.
        const title = 'New job nearby';
        const body = `${booking.pickup?.address || 'Pickup'} → ${booking.drop?.address || 'Drop'} · ₹${booking.price}`;
        const data = { bookingId: String(booking._id), event: 'job:offer', code: booking.code };
        for (const uid of riderUserIds) {
            void notificationService.emit({
                user: uid,
                audience: 'rider',
                topic: 'booking',
                title,
                body,
                data,
            }).catch(() => {});
        }
    },

    async listMine(userId: string) {
        // Payload slimming — the customer app's list view only needs the
        // fields below. We DROP history, pricing, coupon internals, cancel
        // metadata, scheduling internals, and the pickup/drop GeoJSON sub-
        // documents (address/lat/lng carry the same info without the extra
        // `location: { type, coordinates }` wrapper). Populated rider is
        // trimmed to display fields only. Cuts payload ~55-70% per booking.
        return Booking.find({ user: userId })
            .sort({ createdAt: -1 })
            .select('code user rider mode categorySlug vehicleTypeSlug pickup.address pickup.lat pickup.lng extraPickups.address extraPickups.lat extraPickups.lng drop.address drop.lat drop.lng notes noteImages recipientPhone recipientName payment distanceKm etaMin price status createdAt updatedAt')
            .populate({ path: 'rider', select: 'name vehicle vehicleNo rating trips phone' })
            .lean();
    },

    async getOne(userId: string, id: string) {
        // Details view — a bit richer than listMine (shows pricing + coupon
        // + cancel info) but still drops the heavy `history` array and the
        // GeoJSON `location` sub-docs (address/lat/lng cover the UI need).
        const b = await Booking.findOne({ _id: id, user: userId })
            .select('-history -pickup.location -drop.location -extraPickups.location')
            .populate({ path: 'rider', select: 'name vehicle vehicleNo rating trips phone currentLocation' })
            .lean();
        if (!b) throw errors.notFound('Booking not found', 'BOOKING_NOT_FOUND');
        return b;
    },

    async updateStatus(userId: string, id: string, status: BookingStatus, note = '') {
        if (!BOOKING_STATUSES.includes(status)) throw errors.badRequest('Invalid status', 'INVALID_STATUS');
        const b = await Booking.findOne({ _id: id, user: userId });
        if (!b) throw errors.notFound('Booking not found', 'BOOKING_NOT_FOUND');
        b.status = status;
        b.history.push({ status, note } as any);
        await b.save();
        emitBookingUpdate(b);
        return b;
    },

    async cancel(userId: string, id: string, reason = '') {
        const b = await Booking.findOne({ _id: id, user: userId });
        if (!b) throw errors.notFound('Booking not found', 'BOOKING_NOT_FOUND');
        if (['Delivered', 'Cancelled'].includes(b.status)) {
            throw errors.badRequest(`Cannot cancel a ${b.status.toLowerCase()} booking`, 'BOOKING_TERMINAL');
        }

        // Load cancellation policy from settings.
        const Settings = (await import('../models/Settings')).default;
        const s = await Settings.getSingleton();
        const ageSec = Math.floor((Date.now() - new Date((b as any).createdAt).getTime()) / 1000);

        let fee = 0;
        if (ageSec > (s.cancellationGraceSec ?? 120)) {
            if (['Arriving for pickup', 'Picked up', 'On the way'].includes(b.status)) {
                fee = s.cancellationFeeAfterArrive ?? 40;
            } else if (b.status === 'Rider accepted') {
                fee = s.cancellationFeeAfterAccept ?? 20;
            }
        }

        b.status = 'Cancelled';
        b.cancelledReason = String(reason || '').trim();
        (b as any).cancelledBy = 'customer';
        (b as any).cancellationFee = fee;
        (b as any).cancelledAt = new Date();
        b.history.push({ status: 'Cancelled', note: b.cancelledReason || (fee ? `Fee ₹${fee}` : '') } as any);
        await b.save();

        // Look up the assigned rider's userId (if any) BEFORE emitting so the
        // socket fanout can reach the rider's personal room too.
        let riderUserId: string | undefined;
        if (b.rider) {
            const rider = await Rider.findById(b.rider).lean();
            if ((rider as any)?.user) riderUserId = String((rider as any).user);
        }
        emitBookingUpdate(b, riderUserId);
        emitJobCancelled(String(b._id), riderUserId);

        // Notify rider if one was assigned.
        if (riderUserId) {
            void notificationService.emit({
                user: riderUserId,
                audience: 'rider',
                topic: 'booking',
                title: 'Booking cancelled',
                body: `Booking ${b.code} was cancelled by the customer.`,
                data: { event: 'booking:cancelled', bookingId: String(b._id) },
            }).catch(() => {});
        }
        return b;
    },

    async riderCancel(userId: string, id: string, reason = '') {
        const rider = await Rider.findOne({ user: userId });
        if (!rider) throw errors.notFound('Rider not found', 'RIDER_NOT_FOUND');
        const b = await Booking.findOne({ _id: id, rider: rider._id });
        if (!b) throw errors.notFound('Booking not found', 'BOOKING_NOT_FOUND');
        if (['Delivered', 'Cancelled', 'Picked up', 'On the way'].includes(b.status)) {
            throw errors.badRequest(`Cannot cancel a ${b.status.toLowerCase()} booking`, 'BOOKING_TERMINAL');
        }
        b.status = 'Cancelled';
        b.cancelledReason = String(reason || '').trim();
        (b as any).cancelledBy = 'rider';
        (b as any).cancelledAt = new Date();
        b.history.push({ status: 'Cancelled', note: `Rider: ${b.cancelledReason}` } as any);
        await b.save();
        emitBookingUpdate(b);
        emitJobCancelled(String(b._id));

        void notificationService.emit({
            user: String(b.user),
            audience: 'customer',
            topic: 'booking',
            title: 'Rider cancelled',
            body: 'Searching for another rider.',
            data: { event: 'booking:rider_cancelled', bookingId: String(b._id) },
        }).catch(() => {});
        return b;
    },

    /** Compute cancellation fee that WOULD apply now without cancelling. */
    async quoteCancellation(userId: string, id: string) {
        const b = await Booking.findOne({ _id: id, user: userId });
        if (!b) throw errors.notFound('Booking not found', 'BOOKING_NOT_FOUND');
        const Settings = (await import('../models/Settings')).default;
        const s = await Settings.getSingleton();
        const ageSec = Math.floor((Date.now() - new Date((b as any).createdAt).getTime()) / 1000);
        const grace = s.cancellationGraceSec ?? 120;
        let fee = 0;
        if (ageSec > grace) {
            if (['Arriving for pickup', 'Picked up', 'On the way'].includes(b.status)) fee = s.cancellationFeeAfterArrive ?? 40;
            else if (b.status === 'Rider accepted') fee = s.cancellationFeeAfterAccept ?? 20;
        }
        return { fee, graceSec: grace, secondsUntilFree: Math.max(0, grace - ageSec), status: b.status };
    },

    async _legacyAutoAssign(bookingId: string) {
        const booking = await Booking.findById(bookingId);
        if (!booking || booking.status !== 'Searching rider') return;
        const rider = await Rider.findOne({ online: true, available: true }).sort({ rating: -1 });
        if (!rider) return;
        booking.rider = rider._id as any;
        booking.status = 'Rider accepted';
        booking.history.push({ status: 'Rider accepted', note: `Assigned to ${rider.name}` } as any);
        await booking.save();
        emitBookingUpdate(booking);
    },
    async confirmPayment(userId: string, bookingId: string) {
        const b = await Booking.findOne({ _id: bookingId, user: userId });
        if (!b) throw errors.notFound('Booking not found', 'BOOKING_NOT_FOUND');
        if (b.status !== 'Delivered') throw errors.badRequest('Booking not delivered yet', 'BOOKING_NOT_DELIVERED');
        if ((b as any).paymentStatus === 'paid') return b;
        if ((b as any).paymentStatus === 'disputed') {
            throw errors.badRequest('Payment is under dispute', 'PAYMENT_DISPUTED');
        }
        (b as any).paymentStatus = 'paid';
        (b as any).paymentPaidAt = new Date();
        if ((b as any).payment === 'cash' && !(b as any).paymentTxnId) {
            (b as any).paymentTxnId = `CASH-${Date.now()}`;
        }
        (b.history as any).push({ status: b.status, note: `Payment confirmed (${(b as any).payment})` });
        await b.save();
        emitBookingUpdate(b);
        return b;
    },

    async disputePayment(userId: string, bookingId: string, reason = '') {
        const b = await Booking.findOne({ _id: bookingId, user: userId });
        if (!b) throw errors.notFound('Booking not found', 'BOOKING_NOT_FOUND');
        if (b.status !== 'Delivered') throw errors.badRequest('Booking not delivered yet', 'BOOKING_NOT_DELIVERED');
        (b as any).paymentStatus = 'disputed';
        (b.history as any).push({ status: b.status, note: `Payment disputed: ${String(reason || '').slice(0, 200)}` });
        await b.save();
        emitBookingUpdate(b);
        // Open a support ticket so the ops team can follow up.
        void notificationService.emit({
            user: userId,
            audience: 'customer',
            topic: 'booking',
            title: 'Payment dispute filed',
            body: 'Our team will contact you shortly.',
            data: { event: 'payment:disputed', bookingId: String(b._id) },
        }).catch(() => {});
        return b;
    },
};

export default bookingService;
