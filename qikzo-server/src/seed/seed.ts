import 'dotenv/config';
import { connectDB, mongoose } from '../config/db';
import Category from '../models/Category';
import PromoBanner from '../models/PromoBanner';
import Rider from '../models/Rider';
import Settings from '../models/Settings';
import { logger } from '../lib/logger';

/**
 * Helper — build a closed GeoJSON polygon ring from `[lng,lat]` points.
 * The seed uses coarse bounding polygons; admins refine them in the dashboard.
 */
function poly(points: [number, number][]) {
    const ring = [...points];
    const [fx, fy] = ring[0]; const [lx, ly] = ring[ring.length - 1];
    if (fx !== lx || fy !== ly) ring.push([fx, fy]);
    return { type: 'Polygon' as const, coordinates: [ring] };
}

const DELHI = poly([[77.10, 28.50], [77.35, 28.50], [77.35, 28.75], [77.10, 28.75]]);
const NOIDA = poly([[77.30, 28.50], [77.45, 28.50], [77.45, 28.65], [77.30, 28.65]]);
const GURGAON = poly([[77.00, 28.40], [77.15, 28.40], [77.15, 28.55], [77.00, 28.55]]);
const MUMBAI = poly([[72.80, 18.90], [72.98, 18.90], [72.98, 19.15], [72.80, 19.15]]);

const CATEGORIES = [
    {
        slug: 'groceries', name: 'Groceries', emoji: '🛒', hint: 'Veggies, dairy, staples', order: 1,
        states: [
            { name: 'Delhi', active: true, areas: [{ name: 'New Delhi Core', polygon: DELHI, active: true }] },
            { name: 'Uttar Pradesh', active: true, areas: [{ name: 'Noida', polygon: NOIDA, active: true }] },
            { name: 'Haryana', active: true, areas: [{ name: 'Gurgaon', polygon: GURGAON, active: true }] },
        ],
    },
    {
        slug: 'food', name: 'Food', emoji: '🍔', hint: 'Restaurant / takeaway', order: 2,
        states: [
            { name: 'Delhi', active: true, areas: [{ name: 'New Delhi Core', polygon: DELHI, active: true }] },
            { name: 'Maharashtra', active: true, areas: [{ name: 'Mumbai City', polygon: MUMBAI, active: true }] },
        ],
    },
    {
        slug: 'medicines', name: 'Medicines', emoji: '💊', hint: 'Pharmacy pickup', order: 3,
        states: [{ name: 'Delhi', active: true, areas: [{ name: 'New Delhi Core', polygon: DELHI, active: true }] }],
    },
    {
        slug: 'parcel', name: 'Parcel', emoji: '📦', hint: 'Documents, packages', order: 4,
        states: [
            { name: 'Delhi', active: true, areas: [{ name: 'New Delhi Core', polygon: DELHI, active: true }] },
            { name: 'Haryana', active: true, areas: [{ name: 'Gurgaon', polygon: GURGAON, active: true }] },
        ],
    },
    { slug: 'other', name: 'Other', emoji: '✨', hint: 'Anything else', order: 5, states: [] },
];

const BANNERS = [
    { slug: 'food-market', title: 'Chandni Chowk Food Market', subtitle: 'Street food · Old Delhi', address: 'Chandni Chowk, Old Delhi 110006', imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=1200&q=80', coord: { lat: 28.6506, lng: 77.2303 }, order: 1 },
    { slug: 'city-park', title: 'Lodhi Gardens', subtitle: 'City park · Lodhi Road', address: 'Lodhi Rd, New Delhi 110003', imageUrl: 'https://images.unsplash.com/photo-1552083375-1447ce886485?w=1200&q=80', coord: { lat: 28.5931, lng: 77.2197 }, order: 2 },
    { slug: 'mall', title: 'DLF Mall of India', subtitle: 'Shopping mall · Noida', address: 'Sector 18, Noida 201301', imageUrl: 'https://images.unsplash.com/photo-1519567241046-7f570eee3ce6?w=1200&q=80', coord: { lat: 28.5675, lng: 77.3210 }, order: 3 },
    { slug: 'marine-drive', title: 'Marine Drive', subtitle: 'Seaside promenade · Mumbai', address: 'Marine Drive, Mumbai 400020', imageUrl: 'https://images.unsplash.com/photo-1567157577867-05ccb1388e66?w=1200&q=80', coord: { lat: 18.9438, lng: 72.8231 }, order: 4 },
];

const RIDERS = [
    { name: 'Rohit Sharma', vehicle: 'Honda Activa', vehicleNo: 'DL 8S CB 4421', rating: 4.9, trips: 1284 },
    { name: 'Amit Verma', vehicle: 'TVS Jupiter', vehicleNo: 'HR 26 BL 7732', rating: 4.8, trips: 932 },
    { name: 'Suresh Kumar', vehicle: 'Bajaj Pulsar', vehicleNo: 'UP 14 DT 0098', rating: 4.7, trips: 2104 },
];

async function main(): Promise<void> {
    await connectDB();
    await Settings.getSingleton();

    for (const c of CATEGORIES) {
        // Upsert base fields; only seed states/areas when the category is new
        // (never clobber admin-drawn polygons on re-seed).
        const existing = await Category.findOne({ slug: c.slug });
        if (existing) {
            existing.name = c.name; existing.emoji = c.emoji; existing.hint = c.hint; existing.order = c.order;
            if (existing.states.length === 0) existing.states = c.states as any;
            await existing.save();
        } else {
            await Category.create(c);
        }
    }
    for (const b of BANNERS) {
        await PromoBanner.findOneAndUpdate({ slug: b.slug }, b, { upsert: true, setDefaultsOnInsert: true });
    }
    for (const r of RIDERS) {
        await Rider.findOneAndUpdate({ vehicleNo: r.vehicleNo }, r, { upsert: true, setDefaultsOnInsert: true });
    }
    logger.info(`✅ Seeded: ${CATEGORIES.length} categories (with states/areas), ${BANNERS.length} banners, ${RIDERS.length} riders`);
    await mongoose.disconnect();
    process.exit(0);
}

main().catch((err) => {
    logger.error({ err }, 'seed_failed');
    process.exit(1);
});
