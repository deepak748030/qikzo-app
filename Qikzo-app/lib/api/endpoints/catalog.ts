import { http } from '../client';

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
    coord?: { lat: number; lng: number };
    areaName?: string;
    stateName?: string;
    active?: boolean;
    order?: number;
};

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
        return res.items;
    },
};

export default catalogApi;
