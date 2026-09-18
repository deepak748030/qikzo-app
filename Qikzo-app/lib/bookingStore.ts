import { create } from 'zustand';
import { Booking, BookingStatus, Rider as UiRider, pickRider, seedBookings } from './mockData';
import { LatLng } from '@/components/LeafletMap';
import { bookingsApi } from './api/endpoints/bookings';
import type { Booking as ServerBooking, BookingStatus as ServerBookingStatus, Rider as ServerRider } from './api/types';
import { tokenStore } from './api/tokenStore';

export type BannerPickupSource = {
    id: string;
    title: string;
    categorySlug: string;
    menuImageUrl: string;
};

type Stop = {
    address: string;
    coord: LatLng | null;
    /** Present only when this stop was confirmed from a promo banner. */
    bannerSource?: BannerPickupSource | null;
};

type Draft = {
    mode: 'ride' | 'delivery';
    categoryId: string;     // delivery category OR ride option id
    pickup: string;
    drop: string;
    pickupCoord: LatLng | null;
    dropCoord: LatLng | null;
    /** Food menu metadata when Pickup 1 was chosen from a banner. */
    pickupBannerSource: BannerPickupSource | null;
    /** Ordered intermediate pickups (Pickup 2, 3, 4). Max 3. */
    extraPickups: Stop[];
    notes: string;
    noteImages: string[]; // absolute upload URLs already returned by POST /uploads
    recipientPhone: string;
    recipientName: string;
    bookingForOther: boolean;
    payment: 'cash' | 'upi' | 'wallet';
};

const initialDraft: Draft = {
    mode: 'ride',
    categoryId: 'bike',
    pickup: '',
    drop: '',
    pickupCoord: null,
    dropCoord: null,
    pickupBannerSource: null,
    extraPickups: [],
    notes: '',
    noteImages: [],
    recipientPhone: '',
    recipientName: '',
    bookingForOther: false,
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
        extraPickups?: { address: string; lat?: number | null; lng?: number | null }[];
        drop: { address: string; lat?: number | null; lng?: number | null };
        notes?: string;
        noteImages?: string[];
        recipientPhone?: string;
        recipientName?: string;
        payment: 'cash' | 'upi' | 'wallet';
        vehicleTypeSlug?: string;
    }) => Promise<Booking>;
    cancelOnServer: (id: string, reason?: string) => Promise<void>;
    confirmPaymentOnServer: (id: string) => Promise<void>;
    disputePaymentOnServer: (id: string, reason?: string) => Promise<void>;
};

// ---------- Server → UI mappers ----------

// Map every possible server BookingStatus into the UI's simplified set.
// The server enum is the source of truth (see qikzo-server BOOKING_STATUSES).
// Missing keys here previously caused a fallback to 'Searching rider',
// which made the user app pop the "Finding your rider" overlay again the
// moment the rider tapped "I've arrived".
const STATUS_MAP: Record<string, BookingStatus> = {
    'Scheduled': 'Searching rider',
    'Searching rider': 'Searching rider',
    'Rider accepted': 'Rider accepted',
    'Arriving for pickup': 'Arriving for pickup',
    'Rider arriving': 'Arriving for pickup',
    'Rider arrived': 'Arriving for pickup',
    'Picked up': 'Picked up',
    'On the way': 'On the way',
    'In transit': 'On the way',
    'Delivered': 'Delivered',
    'Cancelled': 'Cancelled',
};

function mapRider(r: ServerRider | string | null | undefined, seed: string): UiRider | undefined {
    if (!r) return undefined;
    if (typeof r === 'string') return { ...pickRider(seed), id: r };
    return {
        id: (r as any)._id || (r as any).id,
        name: r.name || 'Rider',
        rating: typeof r.rating === 'number' ? r.rating : 4.8,
        trips: typeof r.trips === 'number' ? r.trips : 0,
        vehicle: r.vehicle || 'Two-wheeler',
        vehicleNo: r.vehicleNo || '—',
    };
}

function coordFromPoint(p: any): { lat: number; lng: number } | null {
    if (!p) return null;
    const lat = Number(p.lat);
    const lng = Number(p.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    return null;
}

function mapBooking(b: ServerBooking): Booking & { serverId: string } {
    return {
        // UI id is the human-readable code so existing screens keep working.
        id: b.code || b._id,
        serverId: b._id,
        categoryId: (b as any).categorySlug || (b as any).vehicleTypeSlug || 'parcel',
        pickup: b.pickup?.address || '',
        drop: b.drop?.address || '',
        pickupCoord: coordFromPoint(b.pickup),
        dropCoord: coordFromPoint(b.drop),
        extraPickups: Array.isArray((b as any).extraPickups)
            ? (b as any).extraPickups.map((p: any) => ({ address: p?.address || '', coord: coordFromPoint(p) }))
            : [],
        notes: b.notes || '',
        recipientPhone: b.recipientPhone || undefined,
        payment: (b.payment as 'cash' | 'upi' | 'wallet') || 'cash',
        paymentStatus: (b as any).paymentStatus || 'pending',
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
            const RIDE_SLUG_MAP: Record<string, string> = {
                bike: 'bike',
                auto: 'auto',
                cab: 'sedan',
                sedan: 'sedan',
                taxi: 'sedan',
            };
            const rideSlug = input.mode === 'ride'
                ? (RIDE_SLUG_MAP[input.categoryId] || input.categoryId)
                : undefined;
            // Idempotency key — server dedupes for 5 min so a network retry
            // or double-tap doesn't create two bookings.
            const idempotencyKey = `bk_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
            const created = await bookingsApi.create({
                mode: input.mode,
                categorySlug: input.categoryId,
                vehicleTypeSlug: input.vehicleTypeSlug ?? rideSlug,
                pickup: input.pickup,
                extraPickups: input.extraPickups,
                drop: input.drop,
                notes: input.notes,
                noteImages: input.noteImages,
                recipientPhone: input.recipientPhone,
                recipientName: input.recipientName,
                payment: input.payment,
            } as any, { idempotencyKey });
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

    confirmPaymentOnServer: async (id) => {
        const existing = get().bookings.find((b) => b.id === id) as (Booking & { serverId?: string }) | undefined;
        if (!existing?.serverId || !tokenStore.get().accessToken) return;
        const b = await bookingsApi.confirmPayment(existing.serverId);
        const mapped = mapBooking(b);
        set((s) => ({ bookings: s.bookings.map((x) => (x.id === id ? mapped : x)) }));
    },

    disputePaymentOnServer: async (id, reason) => {
        const existing = get().bookings.find((b) => b.id === id) as (Booking & { serverId?: string }) | undefined;
        if (!existing?.serverId || !tokenStore.get().accessToken) return;
        const b = await bookingsApi.disputePayment(existing.serverId, reason);
        const mapped = mapBooking(b);
        set((s) => ({ bookings: s.bookings.map((x) => (x.id === id ? mapped : x)) }));
    },
}));

export function newBookingId() {
    return 'QZ' + String(2100 + Math.floor(Math.random() * 9000));
}
