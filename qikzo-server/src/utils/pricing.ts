import env from '../config/env';
import { haversineKm, deterministicKm, type LatLng } from './distance';

export interface EstimateInput {
    pickup: string;
    drop: string;
    pickupCoord?: LatLng | null;
    dropCoord?: LatLng | null;
    /** Optional intermediate pickups; each stop is inserted between pickup and drop in order. */
    stops?: { address: string; lat?: number | null; lng?: number | null }[];
}

export interface Estimate {
    distanceKm: number;
    price: number;
    etaMin: number;
    base: number;
    perKm: number;
}

export function estimateTrip({ pickup, drop, pickupCoord, dropCoord, stops }: EstimateInput): Estimate {
    // Build ordered leg list: pickup → stops[..] → drop.
    const nodes: { label: string; coord?: LatLng | null }[] = [
        { label: pickup, coord: pickupCoord },
        ...((stops || []).map((s) => ({
            label: s.address,
            coord: s.lat != null && s.lng != null ? { lat: s.lat, lng: s.lng } : null,
        }))),
        { label: drop, coord: dropCoord },
    ];

    let total = 0;
    for (let i = 0; i < nodes.length - 1; i++) {
        const a = nodes[i], b = nodes[i + 1];
        let leg = haversineKm(a.coord as LatLng | null | undefined, b.coord as LatLng | null | undefined);
        if (leg == null) leg = deterministicKm(a.label, b.label);
        total += leg;
    }

    const distanceKm = Math.max(1.5, +total.toFixed(2));
    const raw = Math.round(env.PRICE_BASE + distanceKm * env.PRICE_PER_KM);
    const price = Math.max(env.PRICE_MIN, raw);
    const etaMin = Math.max(6, Math.round(8 + distanceKm * 2.4));
    return { distanceKm, price, etaMin, base: env.PRICE_BASE, perKm: env.PRICE_PER_KM };
}

