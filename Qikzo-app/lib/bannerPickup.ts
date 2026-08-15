import { router } from 'expo-router';
import { useBooking } from './bookingStore';

export const MAX_EXTRA_PICKUPS = 3;

type Spot = {
    address: string;
    coord: { lat: number; lng: number };
    banner?: {
        id: string;
        title: string;
        categorySlug?: string;
        menuImageUrl?: string;
    };
};

function sameSpot(
    address: string,
    coord: { lat: number; lng: number } | null | undefined,
    spot: Spot,
) {
    if (address && address === spot.address) return true;
    if (!coord) return false;
    return Math.abs(coord.lat - spot.coord.lat) < 1e-5 && Math.abs(coord.lng - spot.coord.lng) < 1e-5;
}

/**
 * Banner spots are pickup points. Confirming the pin on /select-location
 * redirects straight into the parcel screen (/book-delivery) via
 * router.replace — Back from there returns Home, where another banner can
 * be picked. First confirm → Pickup 1, each later banner confirm →
 * Pickup 2 / 3 / 4 (delivery only).
 */
export function openBannerAsPickup(spot: Spot) {
    const draft = useBooking.getState().draft;
    const params = {
        lat: String(spot.coord.lat),
        lng: String(spot.coord.lng),
        address: spot.address,
        // Carry the selected banner through the map confirmation. The booking
        // draft records it only after the user confirms this exact location.
        bannerId: spot.banner?.id || '',
        bannerTitle: spot.banner?.title || '',
        bannerCategorySlug: spot.banner?.categorySlug || '',
        menuImageUrl: spot.banner?.menuImageUrl || '',
    };

    if (!draft.pickup.trim() || draft.mode === 'ride') {
        router.push({ pathname: '/select-location', params: { ...params, field: 'pickup' } });
        return;
    }

    if (sameSpot(draft.pickup, draft.pickupCoord, spot)) {
        router.push({ pathname: '/select-location', params: { ...params, field: 'pickup' } });
        return;
    }

    const extras = draft.extraPickups;
    const existing = extras.findIndex((s) => sameSpot(s.address, s.coord, spot));
    if (existing >= 0) {
        router.push({
            pathname: '/select-location',
            params: { ...params, field: 'pickup', slot: `pickup${existing + 2}` },
        });
        return;
    }

    const filled = extras.filter((s) => s.address.trim()).length;
    if (filled >= MAX_EXTRA_PICKUPS) return;

    router.push({
        pathname: '/select-location',
        params: { ...params, field: 'pickup', slot: `pickup${filled + 2}` },
    });
}
