import env from '../../config/env';
import CategoryBanner from '../../models/CategoryBanner';
import type { MigrationDef } from '../migrator';

/**
 * 005 — Bring up the Food/Grocery banner collection.
 *
 *  1. Build the declared indexes for `categorybanners` (idempotent —
 *     `createIndex` is a no-op when the index already exists).
 *  2. Seed a handful of demo banners, but ONLY outside production, so the
 *     admin page and the customer Food/Grocery screens are testable on a
 *     fresh database. Production starts empty.
 *
 * No existing collection is read or written here.
 */

const DEMO_BANNERS = [
    {
        key: 'demo-food-weekend',
        title: 'Weekend Food Festival',
        type: 'food' as const,
        imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=1200&q=80',
        description: 'Flat 20% off on weekend orders',
        address: 'Chandni Chowk, Old Delhi 110006',
        coord: { lat: 28.6506, lng: 77.2303 },
        order: 1,
    },
    {
        key: 'demo-food-near-you',
        title: 'Best Food Near You',
        type: 'food' as const,
        imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&q=80',
        description: 'Top rated kitchens, delivered fast',
        address: 'Connaught Place, New Delhi 110001',
        coord: { lat: 28.6315, lng: 77.2167 },
        order: 2,
    },
    {
        key: 'demo-food-dinner',
        title: 'Dinner Deals',
        type: 'food' as const,
        imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80',
        description: 'After 8pm specials',
        address: 'Lajpat Nagar, New Delhi 110024',
        coord: { lat: 28.5708, lng: 77.2375 },
        order: 3,
    },
    {
        key: 'demo-grocery-special',
        title: 'Grocery Special',
        type: 'grocery' as const,
        imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&q=80',
        description: 'Daily essentials at best prices',
        address: 'Sector 18, Noida 201301',
        coord: { lat: 28.5675, lng: 77.321 },
        order: 1,
    },
];

const migration: MigrationDef = {
    name: '005_init_category_banners',
    async up() {
        await CategoryBanner.syncIndexes();

        if (env.isProd) return;

        // Idempotent: keyed on title, so re-running never duplicates.
        for (const b of DEMO_BANNERS) {
            const { key: _key, ...rest } = b;
            await CategoryBanner.findOneAndUpdate(
                { title: rest.title },
                { $setOnInsert: { ...rest, active: true } },
                { upsert: true, setDefaultsOnInsert: true }
            );
        }
    },
};

export default migration;
