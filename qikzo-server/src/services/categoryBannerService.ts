import CategoryBanner from '../models/CategoryBanner';
import Restaurant from '../models/Restaurant';
import { errors } from '../lib/errors';
import { haversineKm } from '../utils/distance';
import restaurantService from './restaurantService';

const clean = (s?: string, max = 1000) => (s || '').trim().slice(0, max);
const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

export type BannerType = 'food' | 'grocery';

/** A Food banner targets restaurants; a Grocery banner targets stores. */
export const KIND_FOR_TYPE: Record<BannerType, 'restaurant' | 'store'> = {
    food: 'restaurant',
    grocery: 'store',
};
export const CATEGORY_FOR_TYPE: Record<BannerType, string> = {
    food: 'food',
    grocery: 'groceries',
};

export type StoreSelection = {
    storeIds: string[];
    storeIdsEmpty: boolean;
    storeNames: string[];
};

/**
 * Pure selection logic — split out from the DB round-trip so it can be unit
 * tested without Mongo (see `__tests__/bannerTargeting.test.ts`).
 *
 * Rules:
 *   - no ids at all            → ALL flag on, empty arrays
 *   - ids that don't exist     → STORE_NOT_FOUND
 *   - id of the wrong kind     → STORE_TYPE_MISMATCH (a Grocery banner may not
 *                                 point at a restaurant, and vice-versa)
 *   - otherwise                → ALL flag off + a name snapshot for the list UI
 */
export function planStoreSelection(
    type: BannerType,
    rawIds: string[] | undefined,
    found: { _id: any; name: string; kind: string }[]
): StoreSelection {
    const ids = Array.isArray(rawIds)
        ? Array.from(new Set(rawIds.map((s) => String(s).trim()).filter((s) => OBJECT_ID_RE.test(s))))
        : [];

    if (ids.length === 0) return { storeIds: [], storeIdsEmpty: true, storeNames: [] };

    const byId = new Map(found.map((s) => [String(s._id), s]));
    const missing = ids.filter((id) => !byId.has(id));
    if (missing.length) {
        throw errors.badRequest(`${missing.length} selected store(s) no longer exist`, 'STORE_NOT_FOUND');
    }

    const expectedKind = KIND_FOR_TYPE[type];
    const wrong = ids.filter((id) => byId.get(id)!.kind !== expectedKind);
    if (wrong.length) {
        throw errors.badRequest(
            `A ${type} banner can only target ${expectedKind}s (${wrong.length} mismatched selection(s))`,
            'STORE_TYPE_MISMATCH'
        );
    }

    return { storeIds: ids, storeIdsEmpty: false, storeNames: ids.map((id) => byId.get(id)!.name) };
}

/** DB-backed wrapper: loads the selected merchants, then applies the rules. */
export async function normaliseStores(type: BannerType, rawIds: string[] | undefined): Promise<StoreSelection> {
    const ids = Array.isArray(rawIds)
        ? Array.from(new Set(rawIds.map((s) => String(s).trim()).filter((s) => OBJECT_ID_RE.test(s))))
        : [];
    if (!ids.length) return { storeIds: [], storeIdsEmpty: true, storeNames: [] };

    const found = await Restaurant.find({ _id: { $in: ids } })
        .select('_id name kind')
        .lean();
    return planStoreSelection(type, ids, found as any);
}

/** "ALL" resolves to every active merchant of the banner's type. */
async function allStoresFor(type: BannerType, limit = 50) {
    return Restaurant.find({ active: true, categorySlug: CATEGORY_FOR_TYPE[type] })
        .sort({ order: 1, name: 1 })
        .limit(limit)
        .lean();
}

async function getOr404(id: string) {
    if (!OBJECT_ID_RE.test(String(id))) throw errors.notFound('Banner not found', 'BANNER_NOT_FOUND');
    const doc = await CategoryBanner.findById(id);
    if (!doc) throw errors.notFound('Banner not found', 'BANNER_NOT_FOUND');
    return doc;
}

function toListItem(b: any, opts: { allCount?: number } = {}) {
    const all = !!b.storeIdsEmpty;
    return {
        _id: String(b._id),
        title: b.title,
        type: b.type,
        imageUrl: b.imageUrl,
        description: b.description || '',
        storeIds: (b.storeIds || []).map((s: any) => String(s)),
        storeNames: b.storeNames || [],
        storeIdsEmpty: all,
        allStores: all,
        storeCount: all ? (opts.allCount ?? (b.storeNames || []).length) : (b.storeIds || []).length,
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
        const items = rows.slice(0, limit);

        // Resolve the "ALL" badge count once per type, not per banner.
        const counts: Partial<Record<BannerType, number>> = {};
        for (const t of ['food', 'grocery'] as BannerType[]) {
            if (items.some((b: any) => b.storeIdsEmpty && b.type === t)) {
                counts[t] = await Restaurant.countDocuments({
                    active: true,
                    categorySlug: CATEGORY_FOR_TYPE[t],
                });
            }
        }

        return {
            items: items.map((b: any) => toListItem(b, { allCount: counts[b.type as BannerType] })),
            nextCursor: hasMore ? String(items[limit - 1]._id) : null,
        };
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

        const selection = await normaliseStores(type, input.storeIds);

        return CategoryBanner.create({
            title,
            type,
            imageUrl,
            description: clean(input.description),
            storeIds: selection.storeIds,
            storeIdsEmpty: selection.storeIdsEmpty,
            storeNames: selection.storeNames,
            active: input.active !== false,
            order: Number.isFinite(Number(input.order)) ? Number(input.order) : 0,
        });
    },

    async update(id: string, patch: any) {
        const doc = await getOr404(id);
        const p = patch || {};

        // Type may change — when it does, re-validate any stored selection so a
        // Food banner can never keep pointing at restaurants after becoming a
        // Grocery banner.
        const nextType: BannerType =
            p.type === 'food' || p.type === 'grocery' ? p.type : (doc as any).type;
        if (p.type === 'food' || p.type === 'grocery') (doc as any).type = nextType;

        if (typeof p.title === 'string' && p.title.trim()) doc.title = clean(p.title, 140);
        if (typeof p.imageUrl === 'string' && p.imageUrl.trim()) doc.imageUrl = clean(p.imageUrl, 500);
        if (typeof p.description === 'string') doc.description = clean(p.description);

        if (Array.isArray(p.storeIds)) {
            const selection = await normaliseStores(nextType, p.storeIds);
            (doc as any).storeIds = selection.storeIds;
            (doc as any).storeIdsEmpty = selection.storeIdsEmpty;
            (doc as any).storeNames = selection.storeNames;
        } else if (p.type === 'food' || p.type === 'grocery') {
            // Type changed but selection wasn't re-sent: re-validate what's stored.
            const existing = (doc as any).storeIds.map((s: any) => String(s));
            const selection = await normaliseStores(nextType, existing);
            (doc as any).storeIds = selection.storeIds;
            (doc as any).storeIdsEmpty = selection.storeIdsEmpty;
            (doc as any).storeNames = selection.storeNames;
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

    async remove(id: string) {
        await getOr404(id);
        await CategoryBanner.findByIdAndDelete(id);
    },

    // ---------- Public (customer app) ----------

    /**
     * Vertical list for the Food or Grocery screen. The `type` filter is
     * applied here, server-side, so a Grocery banner can never reach the Food
     * tab. Optional proximity sort when the client sends its coordinates.
     */
    async listForTab(opts: { type: BannerType; lat?: number; lng?: number; limit?: number }) {
        const type: BannerType = opts.type === 'grocery' ? 'grocery' : 'food';
        const limit = Math.min(Math.max(opts.limit ?? 30, 1), 50);

        const rows = await CategoryBanner.find({ type, active: true })
            .sort({ order: 1, _id: -1 })
            .limit(limit)
            .lean();
        if (!rows.length) return { items: [] };

        const allCount = rows.some((b: any) => b.storeIdsEmpty)
            ? await Restaurant.countDocuments({ active: true, categorySlug: CATEGORY_FOR_TYPE[type] })
            : 0;

        const lat = Number(opts.lat);
        const lng = Number(opts.lng);
        const hasCoord = Number.isFinite(lat) && Number.isFinite(lng);

        let items = rows.map((b: any) => toListItem(b, { allCount }));

        if (hasCoord) {
            // One query for every referenced merchant, then rank each banner by
            // the distance to its nearest applicable store.
            const ids = Array.from(
                new Set(rows.flatMap((b: any) => (b.storeIds || []).map((s: any) => String(s))))
            );
            const coordById = new Map<string, { lat: number; lng: number }>();
            if (ids.length) {
                const stores = await Restaurant.find({ _id: { $in: ids }, active: true })
                    .select('_id coord')
                    .lean();
                for (const s of stores as any[]) {
                    if (s.coord?.lat != null && s.coord?.lng != null) {
                        coordById.set(String(s._id), { lat: Number(s.coord.lat), lng: Number(s.coord.lng) });
                    }
                }
            }
            const allStores = allCount
                ? ((await allStoresFor(type, 50)) as any[]).filter(
                      (s) => s.coord?.lat != null && s.coord?.lng != null
                  )
                : [];

            const distOf = (b: any) => {
                const pool = b.storeIdsEmpty
                    ? allStores.map((s) => ({ lat: Number(s.coord.lat), lng: Number(s.coord.lng) }))
                    : (b.storeIds || [])
                          .map((id: any) => coordById.get(String(id)))
                          .filter(Boolean) as { lat: number; lng: number }[];
                const dists = pool
                    .map((c) => haversineKm({ lat, lng }, c))
                    .filter((d): d is number => typeof d === 'number');
                return dists.length ? Math.min(...dists) : Number.POSITIVE_INFINITY;
            };

            items = rows
                .map((b: any) => ({ item: toListItem(b, { allCount }), dist: distOf(b), order: b.order ?? 0 }))
                .sort((a, x) => a.dist - x.dist || a.order - x.order)
                .map((r) => r.item);
        }

        return { items };
    },

    /** Banner + its applicable merchants (Details tab payload). */
    async detail(id: string) {
        const banner = await getOr404(id);
        if (banner.active === false) throw errors.notFound('Banner not found', 'BANNER_NOT_FOUND');

        const type = (banner as any).type as BannerType;
        const all = !!(banner as any).storeIdsEmpty;
        const stores = all
            ? ((await allStoresFor(type)) as any[])
            : ((await Restaurant.find({
                  _id: { $in: (banner as any).storeIds },
                  active: true,
              })
                  .sort({ order: 1, name: 1 })
                  .lean()) as any[]);

        const rollup = await restaurantService.ratingRollup(stores.map((s) => String(s._id)));

        return {
            banner: toListItem(banner, { allCount: all ? stores.length : undefined }),
            stores: stores.map((s) => {
                const computed = rollup.get(String(s._id));
                const rating = computed && computed.count > 0
                    ? { ...computed, source: 'computed' as const }
                    : {
                          avg: s.ratingSummary?.avg || 0,
                          count: s.ratingSummary?.count || 0,
                          source: (s.ratingSummary?.source || 'manual') as 'manual' | 'computed',
                      };
                return {
                    _id: String(s._id),
                    name: s.name,
                    kind: s.kind,
                    description: s.description || '',
                    imageUrl: s.imageUrl || '',
                    address: s.address || '',
                    coord: s.coord?.lat != null && s.coord?.lng != null
                        ? { lat: Number(s.coord.lat), lng: Number(s.coord.lng) }
                        : null,
                    hours: s.hours || [],
                    offers: (s.offers || []).filter((o: any) => o.active !== false),
                    menu: {
                        imageUrl: s.menu?.imageUrl || '',
                        items: s.menu?.items || [],
                    },
                    rating,
                };
            }),
        };
    },

    /** Rating tab payload. */
    async reviews(id: string, limit = 20) {
        const banner = await getOr404(id);
        const type = (banner as any).type as BannerType;
        const all = !!(banner as any).storeIdsEmpty;
        const stores = all
            ? ((await allStoresFor(type)) as any[])
            : ((await Restaurant.find({ _id: { $in: (banner as any).storeIds }, active: true })
                  .select('_id')
                  .lean()) as any[]);
        return restaurantService.reviewsFor(stores.map((s) => String(s._id)), limit);
    },
};

export default categoryBannerService;
