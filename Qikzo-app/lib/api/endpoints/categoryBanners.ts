import { http } from '../client';
import { API_BASE_URL } from '../config';

export type BannerType = 'food' | 'grocery';

export type CategoryBanner = {
    _id: string;
    title: string;
    type: BannerType;
    imageUrl?: string;
    description?: string;
    address?: string;
    /**
     * Becomes the customer's pickup point when they open the banner. Nullable
     * members because banners saved before the coordinate became mandatory can
     * hold `{ lat: null, lng: null }`.
     */
    coord?: { lat: number | null; lng: number | null } | null;
    active?: boolean;
    order?: number;
};

export type BannerReview = {
    _id: string;
    categorySlug: string;
    stars: number;
    quality: number | null;
    packaging: number | null;
    accuracy: number | null;
    comment: string;
    tags: string[];
    userName: string;
    createdAt: string;
};

export type BannerReviews = {
    summary: { avg: number; count: number };
    items: BannerReview[];
};

/**
 * Admin uploads are stored as `/uploads/...`; React Native needs an absolute
 * URI (same helper the catalog endpoint uses).
 */
function absoluteMediaUrl(url?: string | null): string | undefined {
    if (!url) return undefined;
    if (/^(https?:|data:|file:|content:)/i.test(url)) return url;
    return `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;
}

/**
 * Food / Grocery tab banners. Separate endpoints from the home-carousel
 * `/banners` — the type filter is applied server-side so the Food screen can
 * never receive a Grocery banner.
 */
export const categoryBannersApi = {
    async list(type: BannerType, opts?: { lat?: number; lng?: number }): Promise<CategoryBanner[]> {
        const query: Record<string, string | number> = { type };
        if (typeof opts?.lat === 'number' && typeof opts?.lng === 'number') {
            query.lat = opts.lat;
            query.lng = opts.lng;
        }
        const res = await http.get<{ items: CategoryBanner[] }>('/category-banners', { query });
        return (res.items || []).map((b) => ({ ...b, imageUrl: absoluteMediaUrl(b.imageUrl) }));
    },

    async detail(id: string): Promise<{ banner: CategoryBanner }> {
        const res = await http.get<{ banner: CategoryBanner }>(`/category-banners/${id}`);
        return { banner: { ...res.banner, imageUrl: absoluteMediaUrl(res.banner.imageUrl) } };
    },

    /** Rating tab — rolled up from the existing order reviews for this category. */
    async reviews(id: string, limit = 20): Promise<BannerReviews> {
        return http.get<BannerReviews>(`/category-banners/${id}/reviews`, { query: { limit } });
    },
};

export default categoryBannersApi;
