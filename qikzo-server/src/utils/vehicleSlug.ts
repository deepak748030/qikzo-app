/**
 * Map a rider's free-form `vehicle` string to a canonical vehicle-type slug.
 * Older riders may have registered before we started storing an explicit
 * `vehicleTypeSlug`, so dispatch/poll code needs to infer it from the label
 * ("Bike", "Two-wheeler", "Auto rickshaw", "Sedan", "Cab", etc.) to avoid
 * silently excluding them from every typed ride offer.
 */
const ALIASES: Record<string, RegExp> = {
    bike: /\b(bike|scooter|scooty|motorcycle|two[\s-]?wheeler|2[\s-]?wheeler)\b/i,
    auto: /\b(auto|rickshaw|tuk[\s-]?tuk|three[\s-]?wheeler|3[\s-]?wheeler)\b/i,
    sedan: /\b(sedan|cab|taxi|car|hatchback|suv)\b/i,
};

export function inferVehicleSlug(vehicle?: string | null): string {
    const s = String(vehicle || '').trim();
    if (!s) return '';
    for (const [slug, rx] of Object.entries(ALIASES)) {
        if (rx.test(s)) return slug;
    }
    return '';
}

/** Regex OR that matches any alias for the given canonical slug. */
export function vehicleAliasRegex(slug: string): RegExp | null {
    const rx = ALIASES[slug];
    return rx || null;
}
