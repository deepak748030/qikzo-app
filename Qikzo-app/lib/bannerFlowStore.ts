import { create } from 'zustand';
import type { BannerType } from './api/endpoints/categoryBanners';

/**
 * State for the Food/Grocery banner booking flow.
 *
 * Kept separate from `bookingStore` on purpose: the draft there owns the
 * trip (pickup / drop / payment) and is shared with the existing booking
 * screen, while this store only owns *which banner* the customer came from
 * and the per-merchant order text. Each merchant gets its own entry — the
 * inputs are never merged into a single field.
 */
export type BannerFlowBanner = {
    id: string;
    title: string;
    type: BannerType;
};

export type StoreInput = {
    storeId: string;
    storeName: string;
    note: string;
};

type State = {
    banner: BannerFlowBanner | null;
    /** Keyed by storeId so each merchant's text stays independent. */
    storeInputs: Record<string, StoreInput>;
    setBanner: (b: BannerFlowBanner) => void;
    setStoreNote: (storeId: string, storeName: string, note: string) => void;
    /** Only the merchants the customer actually wrote something for. */
    filledInputs: () => StoreInput[];
    reset: () => void;
};

export const useBannerFlow = create<State>((set, get) => ({
    banner: null,
    storeInputs: {},

    setBanner: (banner) =>
        set((s) => ({
            banner,
            // A different banner means a different merchant set — drop stale text.
            storeInputs: s.banner?.id === banner.id ? s.storeInputs : {},
        })),

    setStoreNote: (storeId, storeName, note) =>
        set((s) => ({
            storeInputs: { ...s.storeInputs, [storeId]: { storeId, storeName, note } },
        })),

    filledInputs: () =>
        Object.values(get().storeInputs)
            .filter((i) => i.note.trim().length > 0)
            .map((i) => ({ ...i, note: i.note.trim() })),

    reset: () => set({ banner: null, storeInputs: {} }),
}));

/**
 * The rider app only reads `notes`, so the per-merchant text is composed into
 * one string as well. That keeps the rider side untouched while the structured
 * `storeInputs` travel alongside for admin/analytics.
 */
export function composeNotes(inputs: StoreInput[]): string {
    return inputs.map((i) => `${i.storeName}: ${i.note}`).join('\n').slice(0, 500);
}

export default useBannerFlow;
