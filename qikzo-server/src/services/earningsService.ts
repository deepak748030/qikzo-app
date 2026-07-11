import Trip from '../models/Trip';
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

        const trips = await Trip.find({
            rider: rider._id,
            stage: 'completed',
            completedAt: { $gte: monthStart },
        }).select('fare completedAt distanceKm durationMin').lean();

        let today = 0, todayTrips = 0, todayMin = 0;
        let week = 0, weekTrips = 0;
        let month = 0, monthTrips = 0;
        const weekly = [0, 0, 0, 0, 0, 0, 0]; // Mon..Sun

        for (const t of trips) {
            const at = t.completedAt ? new Date(t.completedAt) : null;
            if (!at) continue;
            month += t.fare || 0;
            monthTrips += 1;
            if (at >= weekStart) {
                week += t.fare || 0;
                weekTrips += 1;
                const dow = at.getDay(); // 0=Sun
                const idx = dow === 0 ? 6 : dow - 1;
                weekly[idx] += t.fare || 0;
            }
            if (at >= dayStart) {
                today += t.fare || 0;
                todayTrips += 1;
                todayMin += t.durationMin || 0;
            }
        }

        return {
            today, todayTrips, todayHours: +(todayMin / 60).toFixed(1),
            week, weekTrips,
            month, monthTrips,
            weekly,
        };
    },
};

export default earningsService;
