/**
 * Client-side fare estimate that matches the server:
 * haversine over pickup → extra pickups → drop, then base + perKm.
 * Used on the book screen so the price isn't a fake string-hash.
 */

export type LatLng = { lat: number; lng: number };

export function haversineKm(a?: LatLng | null, b?: LatLng | null): number | null {
    if (!a || !b || a.lat == null || b.lat == null || a.lng == null || b.lng == null) return null;
    const R = 6371;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const s =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
    return +(R * c).toFixed(2);
}

function deterministicKm(pickup = '', drop = ''): number {
    const seed = (pickup + '|' + drop).trim().toLowerCase();
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 33 + seed.charCodeAt(i)) >>> 0;
    return +(2 + (h % 1100) / 100).toFixed(1);
}

export type EstimateStop = { address: string; coord?: LatLng | null };

/** Must stay in lockstep with qikzo-server `env.PRICE_*` + `estimateTrip`. */
export const PRICE_BASE = 25;
export const PRICE_PER_KM = 8;
export const PRICE_MIN = 40;

export function estimateRoute(opts: {
    pickup: string;
    drop: string;
    pickupCoord?: LatLng | null;
    dropCoord?: LatLng | null;
    stops?: EstimateStop[];
    base?: number;
    perKm?: number;
    minFare?: number;
}) {
    const nodes: { label: string; coord?: LatLng | null }[] = [
        { label: opts.pickup, coord: opts.pickupCoord },
        ...(opts.stops || []).map((s) => ({ label: s.address, coord: s.coord })),
        { label: opts.drop, coord: opts.dropCoord },
    ];

    let total = 0;
    for (let i = 0; i < nodes.length - 1; i++) {
        const a = nodes[i], b = nodes[i + 1];
        let leg = haversineKm(a.coord, b.coord);
        if (leg == null) leg = deterministicKm(a.label, b.label);
        total += leg;
    }

    const distanceKm = Math.max(1.5, +total.toFixed(2));
    const base = opts.base ?? PRICE_BASE;
    const perKm = opts.perKm ?? PRICE_PER_KM;
    const minFare = opts.minFare ?? PRICE_MIN;
    const price = Math.max(minFare, Math.round(base + distanceKm * perKm));
    const etaMin = Math.max(6, Math.round(8 + distanceKm * 2.4));
    return { distanceKm, price, etaMin, base, perKm };
}
