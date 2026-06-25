import { create } from 'zustand';
import { Booking, BookingStatus, pickRider, seedBookings } from './mockData';
import { LatLng } from '@/components/LeafletMap';

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
    // Default to a ride experience (matches the home screen default toggle).
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
    setDraft: (patch: Partial<Draft>) => void;
    resetDraft: () => void;
    addBooking: (b: Booking) => void;
    updateStatus: (id: string, status: BookingStatus) => void;
    assignRider: (id: string) => void;
    getById: (id: string) => Booking | undefined;
};

export const useBooking = create<State>((set, get) => ({
    draft: initialDraft,
    bookings: seedBookings,
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
}));

export function newBookingId() {
    return 'QZ' + String(2100 + Math.floor(Math.random() * 9000));
}
