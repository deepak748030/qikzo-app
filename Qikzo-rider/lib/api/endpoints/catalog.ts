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
    active?: boolean;
    order?: number;
};

export const catalogApi = {
    async listCategories(): Promise<ServerCategory[]> {
        const res = await http.get<{ items: ServerCategory[] }>('/categories');
        return res.items;
    },

    async listBanners(): Promise<ServerBanner[]> {
        const res = await http.get<{ items: ServerBanner[] }>('/banners');
        return res.items;
    },
};

export default catalogApi;
