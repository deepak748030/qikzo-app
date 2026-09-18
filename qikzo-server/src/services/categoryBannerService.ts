import CategoryBanner from '../models/CategoryBanner';
import OrderReview from '../models/OrderReview';
import { errors } from '../lib/errors';
import { haversineKm, type LatLng } from '../utils/distance';

const clean = (s?: string, max = 1000) => (s || '').trim().slice(0, max);
const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

export type BannerType = 'food' | 'grocery';

/**
 * Which existing `OrderReview.categorySlug` a banner type rolls up into.
 * The customer app's Grocery tab uses the long-standing `groceries` slug.
 */
export const CATEGORY_FOR_TYPE: Record<BannerType, string> = {
    food: 'food',
    grocery: 'groceries',
};

export type Coord = { lat: number; lng: number };

/**
 * Validate + normalise the banner coordinate. Pure so it can be unit tested
 * without Mongo (see `__tests__/bannerTargeting.test.ts`).
 */
export function normaliseCoord(input: any): Coord {
    const lat = Number(input?.lat);
    const lng = Number(input?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw errors.badRequest('Latitude and longitude are required', 'COORD_REQUIRED');
    }
    if (lat < -90 || lat > 90) throw errors.badRequest('Latitude must be between -90 and 90', 'LAT_OUT_OF_RANGE');
    if (lng < -180 || lng > 180) throw errors.badRequest('Longitude must be between -180 and 180', 'LNG_OUT_OF_RANGE');
    return { lat, lng };
}

type Sortable = { coord?: Coord | null; order?: number };

/**
 * Nearest-first ordering for the Food/Grocery list. Pure so the ranking rule
 * is testable in isolation: distance wins, `order` breaks ties, and banners
 * without a usable coordinate sink to the bottom.
 */
export function sortByProximity<T extends Sortable>(banners: T[], user?: LatLng | null): T[] {
    if (!user || !Number.isFinite(user.lat) || !Number.isFinite(user.lng)) {
        return [...banners].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }
    return banners
        .map((b) => {
            const d = b.coord ? haversineKm(user, b.coord) : null;
            return { b, d: typeof d === 'number' ? d : Number.POSITIVE_INFINITY };
        })
        .sort((a, x) => a.d - x.d || (a.b.order ?? 0) - (x.b.order ?? 0))
        .map((r) => r.b);
}

async function getOr404(id: string) {
    if (!OBJECT_ID_RE.test(String(id))) throw errors.notFound('Banner not found', 'BANNER_NOT_FOUND');
    const doc = await CategoryBanner.findById(id);
    if (!doc) throw errors.notFound('Banner not found', 'BANNER_NOT_FOUND');
    return doc;
}

function toPublicBanner(b: any) {
    return {
        _id: String(b._id),
        title: b.title,
        type: b.type,
        imageUrl: b.imageUrl,
        description: b.description || '',
        address: b.address || '',
        coord: { lat: Number(b.coord?.lat), lng: Number(b.coord?.lng) },
        active: b.active !== false,
        order: b.order ?? 0,
        createdAt: b.createdAt,
    };
}

export const categoryBannerService = {
    // ---------- Admin CRUD ----------

    async listAdmin(opts: { type?: BannerType; active?: boolean; limit?: number; cursor?: string } = {}) {
        const limit = Math.min(Math.max(opts.limit ?? 50, 1), 100);
        const filter: any = {};
        if (opts.type) filter.type = opts.type;
        if (opts.active !== undefined) filter.active = opts.active;
        if (opts.cursor && OBJECT_ID_RE.test(opts.cursor)) filter._id = { $lt: opts.cursor };

        const rows = await CategoryBanner.find(filter)
            .sort({ order: 1, _id: -1 })
            .limit(limit + 1)
            .lean();
        const hasMore = rows.length > limit;
        const items = rows.slice(0, limit).map(toPublicBanner);
        return { items, nextCursor: hasMore ? String(items[limit - 1]._id) : null };
    },

    async get(id: string) {
        return getOr404(id);
    },

    async create(input: any) {
        const title = clean(input.title, 140);
        const type = input.type as BannerType;
        const imageUrl = clean(input.imageUrl, 500);
        if (!title) throw errors.badRequest('Title required', 'TITLE_REQUIRED');
        if (type !== 'food' && type !== 'grocery') {
            throw errors.badRequest('Type must be food or grocery', 'TYPE_INVALID');
        }
        if (!imageUrl) throw errors.badRequest('Banner image required', 'IMAGE_REQUIRED');

        return CategoryBanner.create({
            title,
            type,
            imageUrl,
            description: clean(input.description),
            address: clean(input.address, 300),
            coord: normaliseCoord(input.coord),
            active: input.active !== false,
            order: Number.isFinite(Number(input.order)) ? Number(input.order) : 0,
        });
    },

    async update(id: string, patch: any) {
        const doc = await getOr404(id);
        const p = patch || {};

        if (p.type === 'food' || p.type === 'grocery') (doc as any).type = p.type;
        if (typeof p.title === 'string' && p.title.trim()) doc.title = clean(p.title, 140);
        if (typeof p.imageUrl === 'string' && p.imageUrl.trim()) doc.imageUrl = clean(p.imageUrl, 500);
        if (typeof p.description === 'string') doc.description = clean(p.description);
        if (typeof p.address === 'string') doc.address = clean(p.address, 300);
        if (p.coord !== undefined) (doc as any).coord = normaliseCoord(p.coord);
        if (typeof p.active === 'boolean') doc.active = p.active;
        if (Number.isFinite(Number(p.order))) doc.order = Number(p.order);

        await doc.save();
        return doc;
    },

    async toggle(id: string) {
        const doc = await getOr404(id);
        doc.active = !doc.active;
        await doc.save();
        return doc;
    },

    async remove(id: string) {
        await getOr404(id);
        await CategoryBanner.findByIdAndDelete(id);
    },

    // ---------- Public (customer app) ----------

    /**
     * Vertical list for the Food or Grocery screen. The `type` filter is
     * applied here, server-side, so a Grocery banner can never reach the Food
     * tab. When the client sends coordinates the list is nearest-first.
     */
    async listForTab(opts: { type: BannerType; lat?: number; lng?: number; limit?: number }) {
        const type: BannerType = opts.type === 'grocery' ? 'grocery' : 'food';
        const limit = Math.min(Math.max(opts.limit ?? 30, 1), 50);

        const rows = await CategoryBanner.find({ type, active: true })
            .sort({ order: 1, _id: -1 })
            .limit(limit)
            .lean();

        const items = rows.map(toPublicBanner);
        const user =
            Number.isFinite(Number(opts.lat)) && Number.isFinite(Number(opts.lng))
                ? { lat: Number(opts.lat), lng: Number(opts.lng) }
                : null;

        return { items: sortByProximity(items, user) };
    },

    /** Details tab payload. */
    async detail(id: string) {
        const banner = await getOr404(id);
        if (banner.active === false) throw errors.notFound('Banner not found', 'BANNER_NOT_FOUND');
        return { banner: toPublicBanner(banner) };
    },

    /**
     * Rating tab. Rolls up the existing `OrderReview` collection by the
     * category this banner belongs to — no separate review store is needed.
     */
    async reviews(id: string, limit = 20) {
        const banner = await getOr404(id);
        const categorySlug = CATEGORY_FOR_TYPE[(banner as any).type as BannerType] || 'food';

        const grouped = await OrderReview.aggregate([
            { $match: { categorySlug } },
            { $group: { _id: null, count: { $sum: 1 }, avg: { $avg: '$stars' } } },
        ]);
        const count = grouped[0]?.count || 0;
        const avg = grouped[0]?.avg ? Math.round(Number(grouped[0].avg) * 10) / 10 : 0;

        const rows = await OrderReview.find({ categorySlug })
            .sort({ createdAt: -1 })
            .limit(Math.min(Math.max(limit, 1), 50))
            .populate('user', 'name')
            .lean();

        return {
            summary: { avg, count },
            items: rows.map((r: any) => ({
                _id: String(r._id),
                categorySlug: r.categorySlug,
                stars: r.stars,
                quality: r.quality,
                packaging: r.packaging,
                accuracy: r.accuracy,
                comment: r.comment || '',
                tags: r.tags || [],
                userName: r.user?.name || 'Customer',
                createdAt: r.createdAt,
            })),
        };
    },
};

export default categoryBannerService;
