import OrderReview from '../models/OrderReview';
import Booking from '../models/Booking';
import { errors } from '../lib/errors';
import type { SubmitOrderReviewInput } from '../validators/orderReviewValidators';

const clean = (s?: string, max = 800) => (s || '').trim().slice(0, max);

/**
 * Order (item) reviews — the customer reviews the delivered food / medicines /
 * groceries. Rider stars live in `ratingService` and are untouched here.
 */
export const orderReviewService = {
    async submit(userId: string, input: SubmitOrderReviewInput) {
        const booking = await Booking.findOne({ _id: input.bookingId, user: userId })
            .select('_id status categorySlug')
            .lean();
        if (!booking) throw errors.notFound('Booking not found', 'BOOKING_NOT_FOUND');
        if (booking.status !== 'Delivered') {
            throw errors.badRequest('You can only review a delivered order', 'BOOKING_NOT_DELIVERED');
        }

        const existing = await OrderReview.findOne({ booking: booking._id }).lean();
        if (existing) throw errors.badRequest('Order already reviewed', 'ALREADY_REVIEWED');

        try {
            return await OrderReview.create({
                booking: booking._id,
                user: userId,
                categorySlug: booking.categorySlug,
                stars: input.stars,
                quality: input.quality ?? null,
                packaging: input.packaging ?? null,
                accuracy: input.accuracy ?? null,
                comment: clean(input.comment),
                tags: (input.tags || []).map((t) => clean(t, 40)).filter(Boolean).slice(0, 8),
                photos: (input.photos || []).slice(0, 4),
            });
        } catch (e: any) {
            // Unique index race — two submits in flight for the same booking.
            if (e?.code === 11000) throw errors.badRequest('Order already reviewed', 'ALREADY_REVIEWED');
            throw e;
        }
    },

    /** The booking's customer can read back their own review (null when unreviewed). */
    async getForBooking(userId: string, bookingId: string) {
        const booking = await Booking.findOne({ _id: bookingId, user: userId }).select('_id').lean();
        if (!booking) throw errors.notFound('Booking not found', 'BOOKING_NOT_FOUND');
        return OrderReview.findOne({ booking: bookingId }).lean();
    },

    /** The signed-in customer's own review history. */
    async listMine(userId: string, limit = 20) {
        return OrderReview.find({ user: userId })
            .sort({ createdAt: -1 })
            .limit(Math.min(Math.max(limit, 1), 100))
            .lean();
    },

    /** Aggregate order-quality stats, optionally scoped to one category. */
    async summary(categorySlug?: string) {
        const match: any = {};
        if (categorySlug) match.categorySlug = categorySlug.trim().toLowerCase();
        const rows = await OrderReview.aggregate([
            { $match: match },
            {
                $group: {
                    _id: '$categorySlug',
                    count: { $sum: 1 },
                    avgStars: { $avg: '$stars' },
                    avgQuality: { $avg: '$quality' },
                    avgPackaging: { $avg: '$packaging' },
                    avgAccuracy: { $avg: '$accuracy' },
                },
            },
            { $sort: { count: -1 } },
        ]);
        const round = (n: any) => (typeof n === 'number' ? Math.round(n * 10) / 10 : null);
        return rows.map((r) => ({
            categorySlug: r._id,
            count: r.count,
            avgStars: round(r.avgStars),
            avgQuality: round(r.avgQuality),
            avgPackaging: round(r.avgPackaging),
            avgAccuracy: round(r.avgAccuracy),
        }));
    },
};

export default orderReviewService;
