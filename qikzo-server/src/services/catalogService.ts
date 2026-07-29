import Category from '../models/Category';
import PromoBanner from '../models/PromoBanner';
import { haversineKm } from '../utils/distance';

export const catalogService = {
    listCategories: () => Category.find({ active: true }).sort({ order: 1 }).lean(),

    /**
     * Location + category aware banner list.
     * When lat/lng provided we prefer banners whose polygon *contains* the
     * point (via $geoIntersects), then append the rest sorted by distance
     * from each banner's centroid. When categorySlug is provided we only
     * return banners for that category (or with no category set, so a
     * generic banner still shows).
     */
    listBanners: async (opts?: { lat?: number; lng?: number; categorySlug?: string }) => {
        const baseFilter: any = { active: true };
        const slug = opts?.categorySlug?.trim().toLowerCase();
        if (slug) {
            baseFilter.$or = [
                { categorySlug: slug },
                { categorySlug: '' },
                { categorySlug: { $exists: false } },
            ];
        }

        const all = await PromoBanner.find(baseFilter).sort({ order: 1 }).lean();
        const lat = opts?.lat, lng = opts?.lng;
        if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) {
            return all;
        }

        let insideIds = new Set<string>();
        try {
            const inside = await PromoBanner.find({
                ...baseFilter,
                polygon: {
                    $geoIntersects: { $geometry: { type: 'Point', coordinates: [lng, lat] } },
                },
            }).select('_id').lean();
            insideIds = new Set(inside.map((b) => String(b._id)));
        } catch { /* index might be missing on legacy docs — fall through */ }

        const withDist = all.map((b) => ({
            b,
            inside: insideIds.has(String(b._id)),
            dist: haversineKm({ lat, lng }, b.coord as any) ?? Number.POSITIVE_INFINITY,
        }));

        withDist.sort((a, x) => {
            if (a.inside !== x.inside) return a.inside ? -1 : 1;
            return a.dist - x.dist;
        });
        return withDist.map((r) => r.b);
    },
};

export default catalogService;
