import env from '../../config/env';
import VehicleType from '../../models/VehicleType';
import type { MigrationDef } from '../migrator';

/**
 * 001 — Seed baseline VehicleType rows so bookings can start using the new
 * per-vehicle pricing layer instead of the env-var globals (see AUDIT §3.7).
 * Values mirror the current PRICE_BASE / PRICE_PER_KM / PRICE_MIN defaults.
 */
const migration: MigrationDef = {
    name: '001_seed_vehicle_types',
    async up() {
        const rows = [
            { slug: 'bike', name: 'Bike', emoji: '🏍️', capacityKg: 20, seats: 1, categories: ['food', 'parcel', 'medicines'], order: 1 },
            { slug: 'scooty', name: 'Scooty', emoji: '🛵', capacityKg: 25, seats: 1, categories: ['groceries', 'food', 'parcel'], order: 2 },
            { slug: 'auto', name: 'Auto', emoji: '🛺', capacityKg: 200, seats: 3, categories: ['groceries', 'parcel', 'other'], order: 3 },
            { slug: 'mini_truck', name: 'Mini Truck', emoji: '🚚', capacityKg: 750, seats: 1, categories: ['groceries', 'parcel', 'other'], order: 4 },
        ];
        for (const r of rows) {
            await VehicleType.findOneAndUpdate(
                { slug: r.slug },
                {
                    ...r,
                    pricing: {
                        base: env.PRICE_BASE,
                        perKm: env.PRICE_PER_KM,
                        perMin: 0,
                        minFare: env.PRICE_MIN,
                        surge: 1,
                    },
                    active: true,
                },
                { upsert: true, setDefaultsOnInsert: true }
            );
        }
    },
};

export default migration;
