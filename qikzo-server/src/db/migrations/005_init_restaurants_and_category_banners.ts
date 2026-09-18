import env from '../../config/env';
import Restaurant from '../../models/Restaurant';
import CategoryBanner from '../../models/CategoryBanner';
import type { MigrationDef } from '../migrator';

/**
 * 005 — Bring up the Food/Grocery banner flow's two new collections.
 *
 *  1. Build the declared indexes for `restaurants` and `categorybanners`
 *     (idempotent — `createIndex` is a no-op when the index already exists).
 *  2. Seed a handful of demo merchants, but ONLY outside production, so the
 *     admin multi-select and the customer Food/Grocery screens are testable
 *     on a fresh database. Production starts empty and is filled through the
 *     Banner Management → Stores page.
 *
 * No existing collection is read or written here.
 */

const DEMO_RESTAURANTS = [
    {
        slug: 'abc-restaurant',
        name: 'ABC Restaurant',
        kind: 'restaurant' as const,
        categorySlug: 'food',
        description: 'North Indian · Pizza · Fast food',
        address: 'Connaught Place, New Delhi 110001',
        coord: { lat: 28.6315, lng: 77.2167 },
        hours: [{ day: 'Mon-Sun', open: '11:00', close: '23:00' }],
        offers: [{ title: '20% off', detail: 'On orders above ₹499', active: true }],
        menu: {
            items: [
                { name: 'Margherita Pizza', price: 249, category: 'Pizza', veg: true },
                { name: 'Paneer Tikka Pizza', price: 329, category: 'Pizza', veg: true },
                { name: 'Veg Burger', price: 149, category: 'Burgers', veg: true },
                { name: 'Pasta Alfredo', price: 199, category: 'Pasta', veg: true },
                { name: 'Cold Coffee', price: 129, category: 'Drinks', veg: true },
            ],
        },
        order: 1,
    },
    {
        slug: 'xyz-restaurant',
        name: 'XYZ Restaurant',
        kind: 'restaurant' as const,
        categorySlug: 'food',
        description: 'South Indian · Tiffin service',
        address: 'Lajpat Nagar, New Delhi 110024',
        coord: { lat: 28.5708, lng: 77.2375 },
        hours: [{ day: 'Mon-Sun', open: '08:00', close: '22:30' }],
        offers: [{ title: 'Buy 1 Get 1', detail: 'On dosa, weekdays before 12pm', active: true }],
        menu: {
            items: [
                { name: 'Masala Dosa', price: 120, category: 'Dosa', veg: true },
                { name: 'Idli Sambar', price: 80, category: 'Tiffin', veg: true },
                { name: 'Filter Coffee', price: 40, category: 'Drinks', veg: true },
            ],
        },
        order: 2,
    },
    {
        slug: 'delhi-restaurant',
        name: 'Delhi Restaurant',
        kind: 'restaurant' as const,
        categorySlug: 'food',
        description: 'Mughlai · Kebabs · Biryani',
        address: 'Chandni Chowk, Old Delhi 110006',
        coord: { lat: 28.6506, lng: 77.2303 },
        hours: [{ day: 'Tue-Sun', open: '12:00', close: '00:00' }],
        offers: [],
        menu: {
            items: [
                { name: 'Chicken Biryani', price: 289, category: 'Biryani', veg: false },
                { name: 'Seekh Kebab', price: 259, category: 'Kebabs', veg: false },
            ],
        },
        order: 3,
    },
    {
        slug: 'city-fresh-mart',
        name: 'City Fresh Mart',
        kind: 'store' as const,
        categorySlug: 'groceries',
        description: 'Daily groceries · Dairy · Staples',
        address: 'Sector 18, Noida 201301',
        coord: { lat: 28.5675, lng: 77.321 },
        hours: [{ day: 'Mon-Sun', open: '07:00', close: '22:00' }],
        offers: [{ title: 'Free delivery', detail: 'Above ₹299', active: true }],
        menu: {
            items: [
                { name: 'Amul Milk 2L', price: 118, category: 'Dairy', veg: true },
                { name: 'Basmati Rice 1kg', price: 145, category: 'Staples', veg: true },
                { name: 'Brown Bread', price: 55, category: 'Bakery', veg: true },
                { name: 'Farm Eggs (6)', price: 62, category: 'Dairy', veg: false },
            ],
        },
        order: 1,
    },
    {
        slug: 'daily-needs-store',
        name: 'Daily Needs Store',
        kind: 'store' as const,
        categorySlug: 'groceries',
        description: 'Vegetables · Fruits · Household',
        address: 'Gurgaon Sector 14, Haryana 122001',
        coord: { lat: 28.4595, lng: 77.0266 },
        hours: [{ day: 'Mon-Sat', open: '08:00', close: '21:00' }],
        offers: [],
        menu: { items: [] },
        order: 2,
    },
];

const migration: MigrationDef = {
    name: '005_init_restaurants_and_category_banners',
    async up() {
        await Restaurant.syncIndexes();
        await CategoryBanner.syncIndexes();

        if (env.isProd) return;

        for (const r of DEMO_RESTAURANTS) {
            await Restaurant.findOneAndUpdate(
                { slug: r.slug },
                { $setOnInsert: { ...r, active: true } },
                { upsert: true, setDefaultsOnInsert: true }
            );
        }
    },
};

export default migration;
