import env from '../config/env';
import { haversineKm, deterministicKm, type LatLng } from './distance';

export interface EstimateInput {
    pickup: string;
    drop: string;
    pickupCoord?: LatLng | null;
    dropCoord?: LatLng | null;
}

export interface Estimate {
    distanceKm: number;
    price: number;
    etaMin: number;
    base: number;
    perKm: number;
}

export function estimateTrip({ pickup, drop, pickupCoord, dropCoord }: EstimateInput): Estimate {
    let distanceKm = haversineKm(pickupCoord, dropCoord);
    if (distanceKm == null) distanceKm = deterministicKm(pickup, drop);
    distanceKm = Math.max(1.5, distanceKm);
    const raw = Math.round(env.PRICE_BASE + distanceKm * env.PRICE_PER_KM);
    const price = Math.max(env.PRICE_MIN, raw);
    const etaMin = Math.max(6, Math.round(8 + distanceKm * 2.4));
    return { distanceKm, price, etaMin, base: env.PRICE_BASE, perKm: env.PRICE_PER_KM };
}
