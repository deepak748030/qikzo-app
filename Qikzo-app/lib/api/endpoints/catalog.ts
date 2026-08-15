import { http } from '../client';
import { API_BASE_URL } from '../config';

export type ServerCategory = {
    _id: string;
    slug: string;
    name: string;
    hint?: string;
    emoji?: string;
    active?: boolean;
    order?: number;
};

export type ServerBanner = {
    _id: string;
    key: string;
    title: string;
    subtitle?: string;
    address?: string;
    imageUrl?: string;
    /** Optional readable menu attached only to Food banners. */
    menuImageUrl?: string;
    categorySlug?: string;
    coord?: { lat: number; lng: number };
    areaName?: string;
    stateName?: string;
    active?: boolean;
    order?: number;
};

function absoluteMediaUrl(url?: string): string | undefined {
    if (!url) return undefined;
    if (/^(https?:|data:|file:|content:)/i.test(url)) return url;
    return `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;
}

export const catalogApi = {
    async listCategories(): Promise<ServerCategory[]> {
        const res = await http.get<{ items: ServerCategory[] }>('/categories');
        return res.items;
    },

    async listBanners(opts?: { lat?: number; lng?: number; categorySlug?: string }): Promise<ServerBanner[]> {
        const query: Record<string, number | string> = {};
        if (typeof opts?.lat === 'number' && typeof opts?.lng === 'number') {
            query.lat = opts.lat;
            query.lng = opts.lng;
        }
        if (opts?.categorySlug) query.categorySlug = opts.categorySlug;
        const res = await http.get<{ items: ServerBanner[] }>('/banners', { query });
        // Admin uploads are stored as `/uploads/...`; React Native needs an
        // absolute URI, unlike a browser rendering an external URL directly.
        return res.items.map((banner) => ({
            ...banner,
            imageUrl: absoluteMediaUrl(banner.imageUrl),
            menuImageUrl: absoluteMediaUrl(banner.menuImageUrl),
        }));
    },
};

export default catalogApi;
