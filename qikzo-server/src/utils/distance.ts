export interface LatLng { lat: number; lng: number }

export function haversineKm(a?: LatLng | null, b?: LatLng | null): number | null {
    if (!a || !b || a.lat == null || b.lat == null) return null;
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

export function deterministicKm(pickup = '', drop = ''): number {
    const seed = (pickup + '|' + drop).trim().toLowerCase();
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 33 + seed.charCodeAt(i)) >>> 0;
    return +(2 + (h % 1100) / 100).toFixed(1);
}
