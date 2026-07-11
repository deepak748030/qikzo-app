import Booking from '../../models/Booking';
import type { MigrationDef } from '../migrator';

/**
 * 003 — Backfill `pickup.location` / `drop.location` GeoJSON Points from the
 * legacy `lat/lng` fields so existing bookings become 2dsphere-queryable.
 * Skips rows that either already have `location.coordinates` or lack lat/lng.
 */
const migration: MigrationDef = {
    name: '003_backfill_booking_geojson',
    async up() {
        const cursor = Booking.find({
            $or: [
                { 'pickup.location.coordinates': { $exists: false } },
                { 'drop.location.coordinates': { $exists: false } },
            ],
        }).cursor();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for await (const b of cursor as any) {
            const patch: Record<string, unknown> = {};
            if (b.pickup?.lat != null && b.pickup?.lng != null && !b.pickup?.location?.coordinates) {
                patch['pickup.location'] = { type: 'Point', coordinates: [b.pickup.lng, b.pickup.lat] };
            }
            if (b.drop?.lat != null && b.drop?.lng != null && !b.drop?.location?.coordinates) {
                patch['drop.location'] = { type: 'Point', coordinates: [b.drop.lng, b.drop.lat] };
            }
            if (Object.keys(patch).length) {
                await Booking.updateOne({ _id: b._id }, { $set: patch });
            }
        }
    },
};

export default migration;
