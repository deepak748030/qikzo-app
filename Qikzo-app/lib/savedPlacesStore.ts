import { create } from 'zustand';
import { placesApi, type SavedPlace as ApiPlace, type CreatePlaceInput } from './api/endpoints/places';
import { tokenStore } from './api/tokenStore';

export type UiPlace = {
    id: string;
    label: string;
    address: string;
    emoji: string;
    coord: { lat: number; lng: number } | null;
};

export type PendingPick = {
    address: string;
    coord: { lat: number; lng: number } | null;
};

function toUi(p: ApiPlace): UiPlace {
    const lat = p.coord?.lat;
    const lng = p.coord?.lng;
    return {
        id: p._id,
        label: p.label,
        address: p.address,
        emoji: p.emoji || '📍',
        coord: lat != null && lng != null ? { lat, lng } : null,
    };
}

type State = {
    places: UiPlace[];
    loaded: boolean;
    loading: boolean;
    pendingPick: PendingPick | null;
    hydrate: () => Promise<void>;
    add: (input: CreatePlaceInput) => Promise<UiPlace>;
    update: (id: string, input: Partial<CreatePlaceInput>) => Promise<void>;
    remove: (id: string) => Promise<void>;
    setPendingPick: (p: PendingPick | null) => void;
    consumePendingPick: () => PendingPick | null;
};

export const useSavedPlaces = create<State>((set, get) => ({
    places: [],
    loaded: false,
    loading: false,
    pendingPick: null,

    hydrate: async () => {
        if (!tokenStore.get().accessToken) {
            set({ places: [], loaded: true, loading: false });
            return;
        }
        set({ loading: true });
        try {
            const items = await placesApi.list();
            set({ places: (items || []).map(toUi), loaded: true, loading: false });
        } catch {
            set({ loaded: true, loading: false });
        }
    },

    add: async (input) => {
        const place = await placesApi.create(input);
        const ui = toUi(place);
        set({ places: [...get().places, ui] });
        return ui;
    },

    update: async (id, input) => {
        const place = await placesApi.update(id, input);
        const ui = toUi(place);
        set({ places: get().places.map((p) => (p.id === id ? ui : p)) });
    },

    remove: async (id) => {
        await placesApi.remove(id);
        set({ places: get().places.filter((p) => p.id !== id) });
    },

    setPendingPick: (p) => set({ pendingPick: p }),

    consumePendingPick: () => {
        const p = get().pendingPick;
        set({ pendingPick: null });
        return p;
    },
}));
