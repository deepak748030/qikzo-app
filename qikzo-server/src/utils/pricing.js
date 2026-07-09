const env = require('../config/env');
const { haversineKm, deterministicKm } = require('./distance');

// Distance-based fare estimate — mirrors app-side `estimateTrip` for consistency.
exports.estimateTrip = ({ pickup, drop, pickupCoord, dropCoord }) => {
    let distanceKm = haversineKm(pickupCoord, dropCoord);
    if (distanceKm == null) distanceKm = deterministicKm(pickup, drop);
    distanceKm = Math.max(1.5, distanceKm);

    const raw = Math.round(env.PRICE_BASE + distanceKm * env.PRICE_PER_KM);
    const price = Math.max(env.PRICE_MIN, raw);
    const etaMin = Math.max(6, Math.round(8 + distanceKm * 2.4));
    return {
        distanceKm,
        price,
        etaMin,
        base: env.PRICE_BASE,
        perKm: env.PRICE_PER_KM,
    };
};
