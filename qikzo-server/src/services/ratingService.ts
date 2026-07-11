import Rating from '../models/Rating';
import Rider from '../models/Rider';
import Booking from '../models/Booking';
import Trip from '../models/Trip';
import { errors } from '../lib/errors';
import notificationService from './notificationService';

/**
 * Ratings — customer rates rider after `Delivered` booking. The rider's
 * cached `Rider.rating` is recomputed as a straight average of the last
 * 200 ratings so it stays cheap and stable.
 */
export const ratingService = {
    async submit(userId: string, input: { bookingId: string; stars: number; comment?: string; tags?: string[]; tip?: number }) {
        const booking = await Booking.findOne({ _id: input.bookingId, user: userId });
        if (!booking) throw errors.notFound('Booking not found', 'BOOKING_NOT_FOUND');
        if (booking.status !== 'Delivered') {
            throw errors.badRequest('You can only rate a delivered booking', 'BOOKING_NOT_DELIVERED');
        }
        if (!booking.rider) throw errors.badRequest('No rider on this booking', 'NO_RIDER');
        const existing = await Rating.findOne({ booking: booking._id });
        if (existing) throw errors.badRequest('Booking already rated', 'ALREADY_RATED');
        const trip = await Trip.findOne({ booking: booking._id });
        if (!trip) throw errors.notFound('Trip not found', 'TRIP_NOT_FOUND');

        const rating = await Rating.create({
            booking: booking._id,
            trip: trip._id,
            rider: booking.rider,
            user: userId,
            stars: input.stars,
            comment: (input.comment || '').trim().slice(0, 500),
            tags: (input.tags || []).slice(0, 8),
            tip: Math.max(0, Math.min(5000, Math.round(Number(input.tip || 0)))),
        });

        await this._recomputeRider(String(booking.rider));

        const rider = await Rider.findById(booking.rider).lean();
        const tipAmt = Math.max(0, Math.round(Number(input.tip || 0)));
        if ((rider as any)?.user) {
            void notificationService.emit({
                user: String((rider as any).user),
                audience: 'rider',
                topic: 'system',
                title: tipAmt > 0 ? `You received ${input.stars}★ + ₹${tipAmt} tip` : `You received ${input.stars}★`,
                body: (input.comment || '').slice(0, 120) || 'A customer rated your recent trip.',
                data: { event: 'rating:new', bookingId: String(booking._id), stars: input.stars, tip: tipAmt },
            }).catch(() => {});
        }
        return rating;
    },

    async getForBooking(userId: string, bookingId: string) {
        const booking = await Booking.findOne({ _id: bookingId, user: userId }).select('_id').lean();
        if (!booking) throw errors.notFound('Booking not found', 'BOOKING_NOT_FOUND');
        return Rating.findOne({ booking: bookingId }).lean();
    },

    async listForRider(riderId: string, limit = 20) {
        return Rating.find({ rider: riderId })
            .sort({ createdAt: -1 })
            .limit(Math.min(Math.max(limit, 1), 100))
            .lean();
    },

    async _recomputeRider(riderId: string) {
        const recent = await Rating.find({ rider: riderId })
            .sort({ createdAt: -1 })
            .limit(200)
            .select('stars')
            .lean();
        if (!recent.length) return;
        const avg = recent.reduce((s, r) => s + r.stars, 0) / recent.length;
        await Rider.updateOne({ _id: riderId }, { rating: Math.round(avg * 10) / 10 });
    },
};

export default ratingService;
