import { http } from '../client';
import { API_BASE_URL } from '../config';

export type BannerType = 'food' | 'grocery';

export type CategoryBannerSummary = {
    _id: string;
    title: string;
    type: BannerType;
    imageUrl?: string;
    description?: string;
    storeIds: string[];
    storeNames: string[];
    /** True when the admin selected no merchants — the banner covers all of them. */
    storeIdsEmpty: boolean;
    allStores: boolean;
    storeCount: number;
    active?: boolean;
    order?: number;
};

export type BannerMenuItem = {
    name: string;
    price: number | null;
    category: string;
    veg: boolean | null;
};

export type BannerStore = {
    _id: string;
    name: string;
    kind: 'restaurant' | 'store';
    description: string;
    imageUrl?: string;
    address: string;
    coord: { lat: number; lng: number } | null;
    hours: { day: string; open: string; close: string }[];
    offers: { title: string; detail: string; active: boolean }[];
    menu: { imageUrl?: string; items: BannerMenuItem[] };
    rating: { avg: number; count: number; source: 'manual' | 'computed' };
};

export type CategoryBannerDetail = {
    banner: CategoryBannerSummary;
    stores: BannerStore[];
};

export type BannerReview = {
    _id: string;
    storeId: string;
    storeName: string;
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

function mapStore(s: BannerStore): BannerStore {
    return {
        ...s,
        imageUrl: absoluteMediaUrl(s.imageUrl),
        menu: {
            ...s.menu,
            imageUrl: absoluteMediaUrl(s.menu?.imageUrl),
            items: s.menu?.items || [],
        },
    };
}

/**
 * Food / Grocery tab banners. Separate endpoints from the home-carousel
 * `/banners` — the type filter is applied server-side so the Food screen can
 * never receive a Grocery banner.
 */
export const categoryBannersApi = {
    async list(type: BannerType, opts?: { lat?: number; lng?: number }): Promise<CategoryBannerSummary[]> {
        const query: Record<string, string | number> = { type };
        if (typeof opts?.lat === 'number' && typeof opts?.lng === 'number') {
            query.lat = opts.lat;
            query.lng = opts.lng;
        }
        const res = await http.get<{ items: CategoryBannerSummary[] }>('/category-banners', { query });
        return (res.items || []).map((b) => ({ ...b, imageUrl: absoluteMediaUrl(b.imageUrl) }));
    },

    async detail(id: string): Promise<CategoryBannerDetail> {
        const res = await http.get<CategoryBannerDetail>(`/category-banners/${id}`);
        return {
            banner: { ...res.banner, imageUrl: absoluteMediaUrl(res.banner.imageUrl) },
            stores: (res.stores || []).map(mapStore),
        };
    },

    async reviews(id: string, limit = 20): Promise<BannerReviews> {
        return http.get<BannerReviews>(`/category-banners/${id}/reviews`, { query: { limit } });
    },
};

export default categoryBannersApi;
