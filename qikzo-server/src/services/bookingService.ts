import Booking, { BOOKING_STATUSES, type BookingStatus } from '../models/Booking';
import Rider from '../models/Rider';
import { estimateTrip, type EstimateInput } from '../utils/pricing';
import { errors } from '../lib/errors';
import { emitBookingUpdate, emitJobOffer, emitJobCancelled } from '../sockets';
import notificationService from './notificationService';
import couponService from './couponService';

// Serial code generator with a retry loop. Not a crypto-safe id but never
// collides in practice and stays human-readable.
async function nextCode(): Promise<string> {
    for (let i = 0; i < 5; i++) {
        const code = 'QZ' + String(2100 + Math.floor(Math.random() * 9000));
        const clash = await Booking.exists({ code });
        if (!clash) return code;
    }
    return 'QZ' + Date.now().toString().slice(-6);
}

export interface CreateBookingInput {
    userId: string;
    mode?: 'ride' | 'delivery';
    categorySlug: string;
    pickup: { address: string; lat?: number | null; lng?: number | null };
    drop: { address: string; lat?: number | null; lng?: number | null };
    notes?: string;
    recipientPhone?: string;
    payment?: 'cash' | 'upi';
    couponCode?: string;
    scheduledAt?: string;
}



export const bookingService = {
    estimate(input: EstimateInput) {
        return estimateTrip(input);
    },

    async create(input: CreateBookingInput) {
        const est = estimateTrip({
            pickup: input.pickup.address,
            drop: input.drop.address,
            pickupCoord: input.pickup.lat != null ? { lat: input.pickup.lat, lng: input.pickup.lng! } : null,
            dropCoord: input.drop.lat != null ? { lat: input.drop.lat, lng: input.drop.lng! } : null,
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

        const booking = await Booking.create({
            code: await nextCode(),
            user: input.userId,
            mode: input.mode || 'delivery',
            categorySlug: input.categorySlug,
            pickup: input.pickup,
            drop: input.drop,
            notes: input.notes || '',
            recipientPhone: input.recipientPhone || '',
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
            void this._fanoutJobOffer(String(booking._id)).catch(() => {});
            setTimeout(() => this._legacyAutoAssign(String(booking._id)).catch(() => { }), 4000);
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
        if (Number.isFinite(lng) && Number.isFinite(lat)) {
            const nearby = await Rider.find({
                online: true,
                available: true,
                currentLocation: {
                    $near: {
                        $geometry: { type: 'Point', coordinates: [lng, lat] },
                        $maxDistance: 5000,
                    },
                },
            }).select('user').limit(25).lean();
            riderUserIds = nearby.map((r) => String((r as any).user)).filter(Boolean);
        }
        emitJobOffer(booking, riderUserIds);

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
        return Booking.find({ user: userId }).sort({ createdAt: -1 }).populate('rider').lean();
    },

    async getOne(userId: string, id: string) {
        const b = await Booking.findOne({ _id: id, user: userId }).populate('rider').lean();
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
        emitBookingUpdate(b);
        emitJobCancelled(String(b._id));

        // Notify rider if one was assigned.
        if (b.rider) {
            const rider = await Rider.findById(b.rider).lean();
            if ((rider as any)?.user) {
                void notificationService.emit({
                    user: String((rider as any).user),
                    audience: 'rider',
                    topic: 'booking',
                    title: 'Booking cancelled',
                    body: `Booking ${b.code} was cancelled by the customer.`,
                    data: { event: 'booking:cancelled', bookingId: String(b._id) },
                }).catch(() => {});
            }
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
};

export default bookingService;
