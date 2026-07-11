import { create } from 'zustand';
import {
    CompletedJob, IncomingJob, JobStage, JOB_STAGES,
    completedJobs as seedCompleted, incomingJobs,
    CATEGORY_META, JobCategory,
} from './mockData';
import { tripsApi } from './api/endpoints/trips';
import { ridersApi } from './api/endpoints/riders';
import { tokenStore } from './api/tokenStore';
import type { Trip, Booking, TripStage as ServerTripStage } from './api/types';

/**
 * Rider-side booking flow. Fully server-backed when signed in; falls back to
 * the mock incoming feed only when preview / signed-out.
 *
 * Stage mapping (server → rider UI):
 *   assigned/arriving → 'Heading to pickup'
 *   arrived           → 'Arrived at pickup'
 *   started           → 'Picked up'
 *   completed         → 'Delivered'
 */
export type ActiveJob = Omit<IncomingJob, 'expiresInSec'> & {
    stage: JobStage;
    tripId?: string;      // set when server-backed
    bookingId?: string;
    pickupCoord?: { lat: number; lng: number } | null;
    dropCoord?: { lat: number; lng: number } | null;
};

function coordOf(p: any): { lat: number; lng: number } | null {
    if (!p) return null;
    if (typeof p.lat === 'number' && typeof p.lng === 'number') return { lat: p.lat, lng: p.lng };
    const c = p.location?.coordinates;
    if (Array.isArray(c) && c.length === 2) return { lat: c[1], lng: c[0] };
    return null;
}

const CATEGORY_FROM_SLUG: Record<string, JobCategory> = {
    ride: 'ride', bike: 'ride', auto: 'ride', cab: 'ride',
    groceries: 'groceries', food: 'food', medicines: 'medicines',
    parcel: 'parcel', other: 'other',
};

function bookingToIncomingJob(b: any): IncomingJob {
    const cat = CATEGORY_FROM_SLUG[b.categorySlug] || 'parcel';
    return {
        id: String(b._id),
        customerName: b.recipientPhone ? 'Customer' : 'Customer',
        customerPhone: b.recipientPhone || '',
        category: cat,
        pickup: b.pickup?.address || '—',
        drop: b.drop?.address || '—',
        distanceKm: Number(b.distanceKm) || 0,
        etaMin: Number(b.etaMin) || 0,
        fare: Number(b.price) || 0,
        payment: (b.payment as any) || 'cash',
        notes: b.notes || undefined,
        pickupOtp: '1234',
        expiresInSec: 30,
    };
}

const SERVER_TO_UI_STAGE: Record<ServerTripStage, JobStage> = {
    assigned: 'Heading to pickup',
    arriving: 'Heading to pickup',
    arrived: 'Arrived at pickup',
    started: 'Picked up',
    completed: 'Delivered',
    cancelled: 'Delivered',
};

const UI_TO_SERVER_NEXT: Record<JobStage, ServerTripStage> = {
    'Heading to pickup': 'arrived',
    'Arrived at pickup': 'started',
    'Picked up': 'completed',
    'Delivered': 'completed',
};

function tripToActive(t: Trip): ActiveJob {
    const b = typeof t.booking === 'object' ? (t.booking as Booking) : null;
    const cat = (b?.categorySlug && CATEGORY_FROM_SLUG[b.categorySlug]) || 'parcel';
    return {
        id: String(t._id).slice(-4).toUpperCase(),
        tripId: String(t._id),
        bookingId: b ? String((b as any)._id) : undefined,
        customerName: 'Customer',
        customerPhone: b?.recipientPhone || '',
        category: cat,
        pickup: b?.pickup?.address || '—',
        drop: b?.drop?.address || '—',
        distanceKm: Number(t.distanceKm) || Number(b?.distanceKm) || 0,
        etaMin: Number(b?.etaMin) || 0,
        fare: Number(t.fare) || Number(b?.price) || 0,
        payment: (b?.payment as any) || 'cash',
        notes: b?.notes || undefined,
        pickupOtp: '1234',
        stage: SERVER_TO_UI_STAGE[t.stage] || 'Heading to pickup',
        pickupCoord: coordOf(b?.pickup),
        dropCoord: coordOf(b?.drop),
    };
}

function tripToCompleted(t: Trip): CompletedJob | null {
    if (t.stage !== 'completed') return null;
    const b = typeof t.booking === 'object' ? (t.booking as Booking) : null;
    const catKey = (b?.categorySlug as keyof typeof CATEGORY_META) || 'parcel';
    const cat = CATEGORY_META[catKey] ? catKey : 'parcel';
    return {
        id: t._id,
        category: cat as any,
        pickup: b?.pickup?.address || '—',
        drop: b?.drop?.address || '—',
        distanceKm: t.distanceKm || b?.distanceKm || 0,
        fare: t.fare || b?.price || 0,
        payment: (b?.payment as any) || 'cash',
        completedAt: t.completedAt ? Date.parse(t.completedAt) : Date.now(),
    };
}

type State = {
    online: boolean;
    active: ActiveJob | null;
    completed: CompletedJob[];
    loading: boolean;

    // Local-only setters (used by mock/preview flow)
    setOnline: (v: boolean) => void;
    acceptJob: (job: IncomingJob) => void;
    advanceStage: () => void;
    cancelActive: (reason: string) => void;

    // Server-backed operations
    setOnlineOnServer: (v: boolean) => Promise<void>;
    pushLocation: (coord: { lat: number; lng: number }) => Promise<void>;
    fetchIncoming: () => Promise<IncomingJob[]>;
    acceptFromServer: (bookingId: string) => Promise<void>;
    declineFromServer: (bookingId: string, reason?: string) => Promise<void>;
    advanceOnServer: () => Promise<void>;
    cancelOnServer: (reason: string) => Promise<void>;
    hydrateFromServer: () => Promise<void>;
    hydrateActiveFromServer: () => Promise<void>;
};

export const useJobs = create<State>((set, get) => ({
    online: false,
    active: null,
    completed: [],
    loading: false,

    // -------- Local (fallback / preview) --------
    setOnline: (v) => set({ online: v }),

    acceptJob: (job) => {
        const { expiresInSec, ...rest } = job;
        set({ active: { ...rest, stage: 'Heading to pickup' } });
    },

    advanceStage: () => {
        const a = get().active;
        if (!a) return;
        const i = JOB_STAGES.indexOf(a.stage);
        if (i < JOB_STAGES.length - 1) {
            set({ active: { ...a, stage: JOB_STAGES[i + 1] } });
        } else {
            const done: CompletedJob = {
                id: a.id,
                category: a.category,
                pickup: a.pickup,
                drop: a.drop,
                distanceKm: a.distanceKm,
                fare: a.fare,
                payment: a.payment,
                completedAt: Date.now(),
            };
            set((s) => ({ active: null, completed: [done, ...s.completed] }));
        }
    },

    cancelActive: (_reason) => set({ active: null }),

    // -------- Server-backed --------
    setOnlineOnServer: async (v) => {
        set({ online: v });
        const { accessToken } = tokenStore.get();
        if (!accessToken) return;
        try {
            await ridersApi.updateStatus({ online: v });
        } catch {
            // best-effort; keep the UI toggle so the user isn't blocked
        }
    },

    pushLocation: async (coord) => {
        const { accessToken } = tokenStore.get();
        if (!accessToken) return;
        try { await ridersApi.updateLocation(coord); } catch { /* ignore */ }
    },

    fetchIncoming: async () => {
        const { accessToken } = tokenStore.get();
        if (!accessToken) return [];
        try {
            const items = await ridersApi.incoming({ limit: 5 });
            return items.map(bookingToIncomingJob);
        } catch {
            return [];
        }
    },

    acceptFromServer: async (bookingId) => {
        const trip = await ridersApi.acceptBooking(bookingId);
        set({ active: tripToActive(trip) });
    },

    declineFromServer: async (bookingId, reason) => {
        try { await ridersApi.declineBooking(bookingId, reason); } catch { /* ignore */ }
    },

    advanceOnServer: async () => {
        const a = get().active;
        if (!a || !a.tripId) { get().advanceStage(); return; }
        const nextServerStage = UI_TO_SERVER_NEXT[a.stage];
        const trip = await tripsApi.setStage(a.tripId, nextServerStage);
        if (trip.stage === 'completed') {
            const done = tripToCompleted(trip);
            set((s) => ({
                active: null,
                completed: done ? [done, ...s.completed] : s.completed,
            }));
        } else {
            set({ active: tripToActive(trip) });
        }
    },

    cancelOnServer: async (reason) => {
        const a = get().active;
        if (!a || !a.tripId) { get().cancelActive(reason); return; }
        try { await tripsApi.cancel(a.tripId, reason); } catch { /* still clear locally */ }
        set({ active: null });
    },

    hydrateFromServer: async () => {
        const { accessToken } = tokenStore.get();
        if (!accessToken) return;
        set({ loading: true });
        try {
            const trips = await tripsApi.listMine(50);
            const completed = trips.map(tripToCompleted).filter(Boolean) as CompletedJob[];
            set({ completed });
        } catch {
            /* keep mock */
        } finally {
            set({ loading: false });
        }
    },

    hydrateActiveFromServer: async () => {
        const { accessToken } = tokenStore.get();
        if (!accessToken) return;
        try {
            const trip = await tripsApi.active();
            if (trip) set({ active: tripToActive(trip) });
        } catch { /* ignore */ }
    },
}));

// Preview-mode fallback for the mock incoming feed when the user is signed out.
let cursor = 0;
export function nextIncoming(): IncomingJob {
    const job = incomingJobs[cursor % incomingJobs.length];
    cursor += 1;
    return job;
}
