import Restaurant from '../models/Restaurant';
import CategoryBanner from '../models/CategoryBanner';
import OrderReview from '../models/OrderReview';
import { errors } from '../lib/errors';

const clean = (s?: string, max = 2000) => (s || '').trim().slice(0, max);

const slugify = (s: string) =>
    s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || `store-${Date.now()}`;

/** Escape user input before it goes into a regex (prevents ReDoS / injection). */
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

export type RatingSummary = { avg: number; count: number };

const round1 = (n: number) => Math.round(n * 10) / 10;

async function getOr404(id: string) {
    if (!OBJECT_ID_RE.test(String(id))) throw errors.notFound('Store not found', 'STORE_NOT_FOUND');
    const doc = await Restaurant.findById(id);
    if (!doc) throw errors.notFound('Store not found', 'STORE_NOT_FOUND');
    return doc;
}

/**
 * Restaurant / grocery-store master. Only the Food/Grocery banner flow reads
 * this collection — the existing catalog, promo banners and bookings are
 * unaffected.
 */
export const restaurantService = {
    async list(opts: {
        kind?: string;
        categorySlug?: string;
        active?: boolean;
        q?: string;
        limit?: number;
        cursor?: string;
    } = {}) {
        const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
        const filter: any = {};
        if (opts.kind) filter.kind = opts.kind;
        if (opts.categorySlug) filter.categorySlug = opts.categorySlug;
        if (opts.active !== undefined) filter.active = opts.active;
        if (opts.q?.trim()) filter.name = { $regex: escapeRe(opts.q.trim()), $options: 'i' };
        if (opts.cursor && OBJECT_ID_RE.test(opts.cursor)) filter._id = { $lt: opts.cursor };

        const items = await Restaurant.find(filter)
            .sort({ order: 1, name: 1, _id: -1 })
            .limit(limit + 1)
            .lean();
        const hasMore = items.length > limit;
        return {
            items: items.slice(0, limit),
            nextCursor: hasMore ? String(items[limit - 1]._id) : null,
        };
    },

    /** Flat list for the admin multi-select (no pagination chrome). */
    async options(opts: { kind?: string; categorySlug?: string } = {}) {
        const filter: any = { active: true };
        if (opts.kind) filter.kind = opts.kind;
        if (opts.categorySlug) filter.categorySlug = opts.categorySlug;
        return Restaurant.find(filter)
            .select('_id name kind categorySlug address imageUrl')
            .sort({ order: 1, name: 1 })
            .limit(200)
            .lean();
    },

    async get(id: string) {
        return getOr404(id);
    },

    async create(input: any) {
        const name = clean(input.name, 120);
        if (!name) throw errors.badRequest('Store name required', 'NAME_REQUIRED');
        const slug = String(input.slug || slugify(name)).trim().toLowerCase();

        const existing = await Restaurant.findOne({ slug });
        if (existing) throw errors.conflict('Store slug already exists', 'SLUG_EXISTS');

        const kind = input.kind === 'store' ? 'store' : 'restaurant';
        // Tab affinity defaults from the kind so a banner's "ALL" resolves
        // to the right merchants even when the admin skipped the field.
        const categorySlug = String(input.categorySlug || (kind === 'store' ? 'groceries' : 'food'))
            .trim()
            .toLowerCase();

        return Restaurant.create({
            slug,
            name,
            kind,
            categorySlug,
            description: clean(input.description),
            imageUrl: clean(input.imageUrl, 500),
            address: clean(input.address, 300),
            coord:
                input.coord && Number.isFinite(Number(input.coord.lat)) && Number.isFinite(Number(input.coord.lng))
                    ? { lat: Number(input.coord.lat), lng: Number(input.coord.lng) }
                    : { lat: null, lng: null },
            hours: Array.isArray(input.hours) ? input.hours.slice(0, 14) : [],
            offers: Array.isArray(input.offers)
                ? input.offers.slice(0, 10).map((o: any) => ({
                      title: clean(o?.title, 120),
                      detail: clean(o?.detail, 300),
                      active: o?.active !== false,
                  }))
                : [],
            menu: {
                imageUrl: clean(input.menu?.imageUrl, 500),
                items: Array.isArray(input.menu?.items)
                    ? input.menu.items.slice(0, 200).map((i: any) => ({
                          name: clean(i?.name, 120),
                          price: i?.price == null || i?.price === '' ? null : Number(i.price) || null,
                          category: clean(i?.category, 60),
                          veg: typeof i?.veg === 'boolean' ? i.veg : null,
                      }))
                    : [],
            },
            ratingSummary: {
                avg: Math.min(Math.max(Number(input.ratingSummary?.avg) || 0, 0), 5),
                count: Math.max(Math.trunc(Number(input.ratingSummary?.count) || 0), 0),
                source: 'manual',
            },
            active: input.active !== false,
            order: Number.isFinite(Number(input.order)) ? Number(input.order) : 0,
        });
    },

    async update(id: string, patch: any) {
        const doc = await getOr404(id);
        const p = patch || {};

        if (typeof p.name === 'string' && p.name.trim()) doc.name = clean(p.name, 120);
        if (p.kind === 'restaurant' || p.kind === 'store') (doc as any).kind = p.kind;
        if (typeof p.categorySlug === 'string' && p.categorySlug.trim()) {
            (doc as any).categorySlug = p.categorySlug.trim().toLowerCase();
        }
        if (typeof p.description === 'string') doc.description = clean(p.description);
        if (typeof p.imageUrl === 'string') doc.imageUrl = clean(p.imageUrl, 500);
        if (typeof p.address === 'string') doc.address = clean(p.address, 300);
        if (p.coord !== undefined) {
            (doc as any).coord =
                p.coord && Number.isFinite(Number(p.coord.lat)) && Number.isFinite(Number(p.coord.lng))
                    ? { lat: Number(p.coord.lat), lng: Number(p.coord.lng) }
                    : { lat: null, lng: null };
        }
        if (Array.isArray(p.hours)) (doc as any).hours = p.hours.slice(0, 14);
        if (Array.isArray(p.offers)) {
            (doc as any).offers = p.offers.slice(0, 10).map((o: any) => ({
                title: clean(o?.title, 120),
                detail: clean(o?.detail, 300),
                active: o?.active !== false,
            }));
        }
        if (p.menu && typeof p.menu === 'object') {
            (doc as any).menu = {
                imageUrl: clean(p.menu.imageUrl, 500),
                items: Array.isArray(p.menu.items)
                    ? p.menu.items.slice(0, 200).map((i: any) => ({
                          name: clean(i?.name, 120),
                          price: i?.price == null || i?.price === '' ? null : Number(i.price) || null,
                          category: clean(i?.category, 60),
                          veg: typeof i?.veg === 'boolean' ? i.veg : null,
                      }))
                    : [],
            };
        }
        if (p.ratingSummary && typeof p.ratingSummary === 'object') {
            (doc as any).ratingSummary = {
                avg: Math.min(Math.max(Number(p.ratingSummary.avg) || 0, 0), 5),
                count: Math.max(Math.trunc(Number(p.ratingSummary.count) || 0), 0),
                source: 'manual',
            };
        }
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

    /** Refuses to delete a merchant still referenced by a banner. */
    async remove(id: string) {
        await getOr404(id);
        const usedBy = await CategoryBanner.countDocuments({ storeIds: id });
        if (usedBy > 0) {
            throw errors.conflict(
                `${usedBy} banner(s) still use this store. Remove it from those banners first.`,
                'STORE_IN_USE'
            );
        }
        await Restaurant.findByIdAndDelete(id);
    },

    /**
     * Average stars + review count per merchant, computed from OrderReview
     * rows written by the banner flow. Merchants without reviews simply don't
     * appear in the returned map — callers fall back to the stored summary.
     */
    async ratingRollup(storeIds: string[]): Promise<Map<string, RatingSummary>> {
        const ids = storeIds.filter((s) => OBJECT_ID_RE.test(String(s)));
        if (!ids.length) return new Map();
        const rows = await OrderReview.aggregate([
            { $match: { storeId: { $in: ids } } },
            { $group: { _id: '$storeId', count: { $sum: 1 }, avg: { $avg: '$stars' } } },
        ]);
        return new Map(
            rows.map((r: any) => [String(r._id), { avg: round1(Number(r.avg) || 0), count: Number(r.count) || 0 }])
        );
    },

    /** Latest reviews across the given merchants, newest first. */
    async reviewsFor(storeIds: string[], limit = 20) {
        const ids = storeIds.filter((s) => OBJECT_ID_RE.test(String(s)));
        if (!ids.length) return { summary: { avg: 0, count: 0 }, items: [] as any[] };

        const rollup = await this.ratingRollup(ids);
        let total = 0;
        let weighted = 0;
        for (const [, v] of rollup) {
            total += v.count;
            weighted += v.avg * v.count;
        }

        const rows = await OrderReview.find({ storeId: { $in: ids } })
            .sort({ createdAt: -1 })
            .limit(Math.min(Math.max(limit, 1), 50))
            .populate('user', 'name')
            .lean();

        return {
            summary: { avg: total ? round1(weighted / total) : 0, count: total },
            items: rows.map((r: any) => ({
                _id: String(r._id),
                storeId: String(r.storeId),
                storeName: r.storeName || '',
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

export default restaurantService;
