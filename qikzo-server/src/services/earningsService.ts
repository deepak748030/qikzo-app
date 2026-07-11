import Trip from '../models/Trip';
import Booking from '../models/Booking';
import Payout from '../models/Payout';
import { riderService } from './riderService';

function startOfDay(d = new Date()) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}

export const earningsService = {
    async summary(userId: string) {
        const rider = await riderService.getOrCreateForUser(userId);
        const now = new Date();
        const dayStart = startOfDay(now);
        const weekStart = startOfDay(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000));
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        // All completed trips this month (used for today/week/month buckets).
        const trips = await Trip.find({
            rider: rider._id,
            stage: 'completed',
            completedAt: { $gte: monthStart },
        }).select('fare completedAt distanceKm durationMin booking').lean();

        let today = 0, todayTrips = 0, todayMin = 0;
        let week = 0, weekTrips = 0, weekMin = 0;
        let month = 0, monthTrips = 0, monthMin = 0;
        const weekly = [0, 0, 0, 0, 0, 0, 0]; // Mon..Sun
        const todayBookingIds: any[] = [];

        for (const t of trips) {
            const at = t.completedAt ? new Date(t.completedAt) : null;
            if (!at) continue;
            month += t.fare || 0;
            monthTrips += 1;
            monthMin += t.durationMin || 0;
            if (at >= weekStart) {
                week += t.fare || 0;
                weekTrips += 1;
                weekMin += t.durationMin || 0;
                const dow = at.getDay();
                const idx = dow === 0 ? 6 : dow - 1;
                weekly[idx] += t.fare || 0;
            }
            if (at >= dayStart) {
                today += t.fare || 0;
                todayTrips += 1;
                todayMin += t.durationMin || 0;
                if (t.booking) todayBookingIds.push(t.booking);
            }
        }

        // Today's cash vs UPI split — resolved from the linked bookings.
        let cashCollected = 0, upiCollected = 0;
        if (todayBookingIds.length) {
            const bookings = await Booking.find({ _id: { $in: todayBookingIds } })
                .select('payment fare').lean();
            const fareById = new Map<string, { payment: string; fare: number }>();
            for (const b of bookings) fareById.set(String(b._id), { payment: (b as any).payment || 'cash', fare: (b as any).fare || 0 });
            for (const t of trips) {
                if (!t.completedAt || new Date(t.completedAt) < dayStart) continue;
                const info = t.booking ? fareById.get(String(t.booking)) : null;
                const amt = t.fare || 0;
                if (info?.payment === 'upi') upiCollected += amt;
                else cashCollected += amt;
            }
        }

        // Next payout = lifetime earnings minus already-paid payouts.
        const [lifetimeAgg, paidAgg] = await Promise.all([
            Trip.aggregate([
                { $match: { rider: rider._id, stage: 'completed' } },
                { $group: { _id: null, total: { $sum: '$fare' } } },
            ]),
            Payout.aggregate([
                { $match: { rider: rider._id, status: 'paid' } },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),
        ]);
        const lifetime = lifetimeAgg[0]?.total || 0;
        const paid = paidAgg[0]?.total || 0;
        const nextPayoutAmount = Math.max(0, lifetime - paid);

        return {
            today, todayTrips, todayHours: +(todayMin / 60).toFixed(1),
            week, weekTrips, weekHours: +(weekMin / 60).toFixed(1),
            month, monthTrips, monthHours: +(monthMin / 60).toFixed(1),
            weekly,
            cashCollected, upiCollected,
            nextPayoutAmount,
        };
    },
};

export default earningsService;
