import { http } from '../client';

export type SavedPlace = {
    _id: string;
    user: string;
    label: string;
    address: string;
    emoji?: string;
    coord?: { lat: number; lng: number } | null;
    createdAt: string;
    updatedAt: string;
};

export type CreatePlaceInput = {
    label: string;
    address: string;
    emoji?: string;
    coord?: { lat: number; lng: number } | null;
};

export const placesApi = {
    async list(): Promise<SavedPlace[]> {
        const res = await http.get<{ items: SavedPlace[] }>('/places');
        return res.items;
    },

    async create(input: CreatePlaceInput): Promise<SavedPlace> {
        const res = await http.post<{ place: SavedPlace }>('/places', input);
        return res.place;
    },

    async remove(id: string): Promise<void> {
        await http.delete(`/places/${id}`);
    },
};

export default placesApi;
