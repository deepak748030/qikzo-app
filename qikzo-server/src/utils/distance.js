// Haversine distance in kilometres between two {lat, lng} points.
exports.haversineKm = (a, b) => {
    if (!a || !b || a.lat == null || b.lat == null) return null;
    const R = 6371;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const s =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
    return +(R * c).toFixed(2);
};

// Deterministic fallback distance when coordinates are missing — matches app-side logic.
exports.deterministicKm = (pickup = '', drop = '') => {
    const seed = (pickup + '|' + drop).trim().toLowerCase();
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 33 + seed.charCodeAt(i)) >>> 0;
    return +(2 + (h % 1100) / 100).toFixed(1);
};
