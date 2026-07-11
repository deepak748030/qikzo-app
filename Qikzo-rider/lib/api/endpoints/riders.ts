import { http } from '../client';
import type { Rider } from '../types';

export const ridersApi = {
    // ---------- Public (customer app) ----------
    async listAvailable(): Promise<Rider[]> {
        const res = await http.get<{ items: Rider[] }>('/riders/available');
        return res.items;
    },

    async nearby(coords: { lat: number; lng: number }, opts: { radiusM?: number; limit?: number } = {}): Promise<Rider[]> {
        const res = await http.get<{ items: Rider[] }>('/riders/nearby', {
            query: {
                lat: coords.lat,
                lng: coords.lng,
                radiusM: opts.radiusM,
                limit: opts.limit,
            },
        });
        return res.items;
    },

    async getPublic(id: string): Promise<Rider> {
        const res = await http.get<{ rider: Rider }>(`/riders/${id}`);
        return res.rider;
    },

    // ---------- Self-service (rider app) ----------
    async me(): Promise<Rider> {
        const res = await http.get<{ rider: Rider }>('/riders/me');
        return res.rider;
    },

    async updateStatus(patch: { online?: boolean; available?: boolean }): Promise<Rider> {
        const res = await http.patch<{ rider: Rider }>('/riders/me/status', patch);
        return res.rider;
    },

    async updateLocation(coord: { lat: number; lng: number }): Promise<Rider> {
        const res = await http.patch<{ rider: Rider }>('/riders/me/location', coord);
        return res.rider;
    },

    async updateVehicle(patch: { vehicle: string; vehicleNo: string; vehicleTypeSlug?: string }): Promise<Rider> {
        const res = await http.patch<{ rider: Rider }>('/riders/me/vehicle', patch);
        return res.rider;
    },

    /** Bookings currently searching for a rider, filtered near the rider. */
    async incoming(opts: { radiusM?: number; limit?: number } = {}): Promise<any[]> {
        const res = await http.get<{ items: any[] }>('/riders/me/incoming', { query: opts });
        return res.items;
    },

    /** Rider claims a booking → returns the created Trip. */
    async acceptBooking(bookingId: string): Promise<any> {
        const res = await http.post<{ trip: any }>(`/riders/bookings/${bookingId}/accept`, {});
        return res.trip;
    },

    async declineBooking(bookingId: string, reason?: string): Promise<void> {
        await http.post(`/riders/bookings/${bookingId}/decline`, { reason });
    },
};

export default ridersApi;
