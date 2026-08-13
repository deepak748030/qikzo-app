import { http } from '../client';
import type { Booking, BookingEstimate, CreateBookingInput, BookingStatus, Point } from '../types';

export const bookingsApi = {
    async estimate(input: {
        pickup: string | Point;
        drop: string | Point;
        pickupCoord?: { lat: number; lng: number } | null;
        dropCoord?: { lat: number; lng: number } | null;
        extraPickups?: Point[];
    }): Promise<BookingEstimate> {
        return (await http.post<BookingEstimate>('/bookings/estimate', input)) as unknown as BookingEstimate;
    },

    async create(input: CreateBookingInput, opts: { idempotencyKey?: string } = {}): Promise<Booking> {
        const headers: Record<string, string> = {};
        if (opts.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey;
        const res = await http.post<{ booking: Booking }>('/bookings', input, { headers });
        return res.booking;
    },

    async listMine(): Promise<Booking[]> {
        const res = await http.get<{ items: Booking[] }>('/bookings');
        return res.items;
    },

    async getOne(id: string): Promise<Booking> {
        const res = await http.get<{ booking: Booking }>(`/bookings/${id}`);
        return res.booking;
    },

    async updateStatus(id: string, status: BookingStatus, note?: string): Promise<Booking> {
        const res = await http.patch<{ booking: Booking }>(`/bookings/${id}/status`, { status, note });
        return res.booking;
    },

    async cancelQuote(id: string): Promise<{ fee: number; graceSec: number; secondsUntilFree: number; status: string }> {
        return http.get(`/bookings/${id}/cancel-quote`);
    },

    async cancel(id: string, reason?: string): Promise<Booking> {
        const res = await http.post<{ booking: Booking }>(`/bookings/${id}/cancel`, { reason });
        return res.booking;
    },
    async confirmPayment(id: string): Promise<Booking> {
        const res = await http.post<{ booking: Booking }>(`/bookings/${id}/confirm-payment`);
        return res.booking;
    },

    async disputePayment(id: string, reason?: string): Promise<Booking> {
        const res = await http.post<{ booking: Booking }>(`/bookings/${id}/dispute-payment`, { reason });
        return res.booking;
    },
};

export default bookingsApi;
