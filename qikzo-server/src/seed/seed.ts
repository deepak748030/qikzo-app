import 'dotenv/config';
import { connectDB, mongoose } from '../config/db';
import Category from '../models/Category';
import PromoBanner from '../models/PromoBanner';
import Rider from '../models/Rider';
import Settings from '../models/Settings';
import { logger } from '../lib/logger';

const CATEGORIES = [
    { slug: 'groceries', name: 'Groceries', emoji: '🛒', hint: 'Veggies, dairy, staples', order: 1 },
    { slug: 'food', name: 'Food', emoji: '🍔', hint: 'Restaurant / takeaway', order: 2 },
    { slug: 'medicines', name: 'Medicines', emoji: '💊', hint: 'Pharmacy pickup', order: 3 },
    { slug: 'parcel', name: 'Parcel', emoji: '📦', hint: 'Documents, packages', order: 4 },
    { slug: 'other', name: 'Other', emoji: '✨', hint: 'Anything else', order: 5 },
];

const BANNERS = [
    { slug: 'food-market', title: 'Chandni Chowk Food Market', subtitle: 'Street food · Old Delhi', address: 'Chandni Chowk, Old Delhi 110006', coord: { lat: 28.6506, lng: 77.2303 }, order: 1 },
    { slug: 'city-park', title: 'Lodhi Gardens', subtitle: 'City park · Lodhi Road', address: 'Lodhi Rd, New Delhi 110003', coord: { lat: 28.5931, lng: 77.2197 }, order: 2 },
    { slug: 'mall', title: 'DLF Mall of India', subtitle: 'Shopping mall · Noida', address: 'Sector 18, Noida 201301', coord: { lat: 28.5675, lng: 77.3210 }, order: 3 },
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
        await Category.findOneAndUpdate({ slug: c.slug }, c, { upsert: true, setDefaultsOnInsert: true });
    }
    for (const b of BANNERS) {
        await PromoBanner.findOneAndUpdate({ slug: b.slug }, b, { upsert: true, setDefaultsOnInsert: true });
    }
    for (const r of RIDERS) {
        await Rider.findOneAndUpdate({ vehicleNo: r.vehicleNo }, r, { upsert: true, setDefaultsOnInsert: true });
    }
    logger.info(`✅ Seeded: ${CATEGORIES.length} categories, ${BANNERS.length} banners, ${RIDERS.length} riders`);
    await mongoose.disconnect();
    process.exit(0);
}

main().catch((err) => {
    logger.error({ err }, 'seed_failed');
    process.exit(1);
});
