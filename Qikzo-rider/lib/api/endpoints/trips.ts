import { http } from '../client';
import type { Trip, TripStage } from '../types';

export const tripsApi = {
    async listMine(limit = 50): Promise<Trip[]> {
        const res = await http.get<{ items: Trip[] }>('/trips', { query: { limit } });
        return res.items;
    },

    async active(): Promise<Trip | null> {
        const res = await http.get<{ trip: Trip | null }>('/trips/active');
        return res.trip;
    },

    async getOne(id: string): Promise<Trip> {
        const res = await http.get<{ trip: Trip }>(`/trips/${id}`);
        return res.trip;
    },

    async forBooking(bookingId: string): Promise<Trip | null> {
        const res = await http.get<{ trip: Trip | null }>(`/trips/by-booking/${bookingId}`);
        return res.trip;
    },

    /**
     * Rider advances the trip stage. `otp` is the 4-digit delivery code the
     * customer reads out at drop-off — required when stage is 'completed'
     * on delivery trips (server enforces it).
     */
    async setStage(id: string, stage: TripStage, otp?: string): Promise<Trip> {
        const res = await http.patch<{ trip: Trip }>(`/trips/${id}/stage`, otp ? { stage, otp } : { stage });
        return res.trip;
    },

    /** Rider cancels an in-flight trip. */
    async cancel(id: string, reason?: string): Promise<Trip> {
        const res = await http.post<{ trip: Trip }>(`/trips/${id}/cancel`, { reason });
        return res.trip;
    },
};

export default tripsApi;
