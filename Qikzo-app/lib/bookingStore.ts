import { create } from 'zustand';
import { Booking, BookingStatus, Rider as UiRider, pickRider, seedBookings } from './mockData';
import { LatLng } from '@/components/LeafletMap';
import { bookingsApi } from './api/endpoints/bookings';
import type { Booking as ServerBooking, BookingStatus as ServerBookingStatus, Rider as ServerRider } from './api/types';
import { tokenStore } from './api/tokenStore';

type Draft = {
    mode: 'ride' | 'delivery';
    categoryId: string;     // delivery category OR ride option id
    pickup: string;
    drop: string;
    pickupCoord: LatLng | null;
    dropCoord: LatLng | null;
    notes: string;
    recipientPhone: string;
    payment: 'cash' | 'upi';
};

const initialDraft: Draft = {
    mode: 'ride',
    categoryId: 'bike',
    pickup: '',
    drop: '',
    pickupCoord: null,
    dropCoord: null,
    notes: '',
    recipientPhone: '',
    payment: 'cash',
};

type State = {
    draft: Draft;
    bookings: Booking[];
    loading: boolean;
    lastError: string | null;
    setDraft: (patch: Partial<Draft>) => void;
    resetDraft: () => void;
    addBooking: (b: Booking) => void;
    updateStatus: (id: string, status: BookingStatus) => void;
    assignRider: (id: string) => void;
    getById: (id: string) => Booking | undefined;

    // Server-backed operations. Local mock state stays as a fallback for the
    // signed-out preview experience; once we have an access token we treat the
    // server as the source of truth.
    hydrateFromServer: () => Promise<void>;
    refreshOne: (id: string) => Promise<void>;
    createOnServer: (input: {
        mode: 'ride' | 'delivery';
        categoryId: string;
        pickup: { address: string; lat?: number | null; lng?: number | null };
        drop: { address: string; lat?: number | null; lng?: number | null };
        notes?: string;
        recipientPhone?: string;
        payment: 'cash' | 'upi';
    }) => Promise<Booking>;
    cancelOnServer: (id: string, reason?: string) => Promise<void>;
};

// ---------- Server → UI mappers ----------

// Server exposes richer status vocabulary than the mock UI. Collapse to the UI set.
const STATUS_MAP: Record<ServerBookingStatus, BookingStatus> = {
    'Searching rider': 'Searching rider',
    'Rider accepted': 'Rider accepted',
    'Rider arriving': 'Arriving for pickup',
    'Rider arrived': 'Arriving for pickup',
    'Picked up': 'Picked up',
    'In transit': 'On the way',
    'Delivered': 'Delivered',
    'Cancelled': 'Cancelled',
};

function mapRider(r: ServerRider | string | null | undefined, seed: string): UiRider | undefined {
    if (!r) return undefined;
    if (typeof r === 'string') return pickRider(seed);
    return {
        name: r.name || 'Rider',
        rating: typeof r.rating === 'number' ? r.rating : 4.8,
        trips: typeof r.trips === 'number' ? r.trips : 0,
        vehicle: r.vehicle || 'Two-wheeler',
        vehicleNo: r.vehicleNo || '—',
    };
}

function mapBooking(b: ServerBooking): Booking & { serverId: string } {
    return {
        // UI id is the human-readable code so existing screens keep working.
        id: b.code || b._id,
        serverId: b._id,
        categoryId: (b as any).categorySlug || (b as any).vehicleTypeSlug || 'parcel',
        pickup: b.pickup?.address || '',
        drop: b.drop?.address || '',
        notes: b.notes || '',
        recipientPhone: b.recipientPhone || undefined,
        payment: (b.payment as 'cash' | 'upi') || 'cash',
        distanceKm: Number(b.distanceKm) || 0,
        etaMin: Number(b.etaMin) || 0,
        price: Number(b.price) || 0,
        status: STATUS_MAP[b.status] || 'Searching rider',
        createdAt: b.createdAt ? Date.parse(b.createdAt) : Date.now(),
        rider: mapRider(b.rider as any, b.code || b._id),
    } as Booking & { serverId: string };
}

// Merge helper — server results replace matching entries by serverId/code, unknown
// local entries (e.g. seed samples for signed-out UX) are dropped.
function mergeServerList(server: (Booking & { serverId: string })[]): Booking[] {
    return server.sort((a, b) => b.createdAt - a.createdAt);
}

export const useBooking = create<State>((set, get) => ({
    draft: initialDraft,
    bookings: seedBookings,
    loading: false,
    lastError: null,

    setDraft: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
    resetDraft: () => set({ draft: initialDraft }),
    addBooking: (b) => set((s) => ({ bookings: [b, ...s.bookings] })),
    updateStatus: (id, status) =>
        set((s) => ({ bookings: s.bookings.map((b) => (b.id === id ? { ...b, status } : b)) })),
    assignRider: (id) =>
        set((s) => ({
            bookings: s.bookings.map((b) =>
                b.id === id ? { ...b, rider: pickRider(b.id), status: 'Rider accepted' } : b
            ),
        })),
    getById: (id) => get().bookings.find((b) => b.id === id),

    hydrateFromServer: async () => {
        // Skip if not signed in — screens still render local seed history.
        if (!tokenStore.get().accessToken) return;
        set({ loading: true, lastError: null });
        try {
            const list = await bookingsApi.listMine();
            const mapped = list.map(mapBooking);
            set({ bookings: mergeServerList(mapped), loading: false });
        } catch (e: any) {
            set({ loading: false, lastError: e?.message || 'Failed to load bookings' });
        }
    },

    refreshOne: async (id) => {
        if (!tokenStore.get().accessToken) return;
        // `id` here is the UI id (server code). Find serverId for the GET.
        const existing = get().bookings.find((b) => b.id === id) as (Booking & { serverId?: string }) | undefined;
        if (!existing?.serverId) return;
        try {
            const b = await bookingsApi.getOne(existing.serverId);
            const mapped = mapBooking(b);
            set((s) => ({ bookings: s.bookings.map((x) => (x.id === id ? mapped : x)) }));
        } catch { /* keep local state */ }
    },

    createOnServer: async (input) => {
        set({ loading: true, lastError: null });
        try {
            const created = await bookingsApi.create({
                mode: input.mode,
                categorySlug: input.categoryId,
                pickup: input.pickup,
                drop: input.drop,
                notes: input.notes,
                recipientPhone: input.recipientPhone,
                payment: input.payment,
            });
            const mapped = mapBooking(created);
            set((s) => ({ bookings: [mapped, ...s.bookings], loading: false }));
            return mapped;
        } catch (e: any) {
            set({ loading: false, lastError: e?.message || 'Failed to create booking' });
            throw e;
        }
    },

    cancelOnServer: async (id, reason) => {
        const existing = get().bookings.find((b) => b.id === id) as (Booking & { serverId?: string }) | undefined;
        // If we don't have a serverId (old seed row), fall back to local update.
        if (!existing?.serverId || !tokenStore.get().accessToken) {
            get().updateStatus(id, 'Cancelled');
            return;
        }
        try {
            const b = await bookingsApi.cancel(existing.serverId, reason);
            const mapped = mapBooking(b);
            set((s) => ({ bookings: s.bookings.map((x) => (x.id === id ? mapped : x)) }));
        } catch {
            // Optimistic local fallback so the user isn't stuck.
            get().updateStatus(id, 'Cancelled');
        }
    },
}));

export function newBookingId() {
    return 'QZ' + String(2100 + Math.floor(Math.random() * 9000));
}
