import { create } from 'zustand';

export type ServiceMode = 'ride' | 'delivery';

type State = {
    mode: ServiceMode;
    setMode: (m: ServiceMode) => void;
};

export const useServiceMode = create<State>((set) => ({
    // Default landing experience is Rides (not Delivery).
    mode: 'ride',
    setMode: (m) => set({ mode: m }),
}));

export type RideOption = {
    id: string;
    name: string;
    emoji: string;
    hint: string;
    perKm: number;
    base: number;
    capacity: string;
};

export const rideOptions: RideOption[] = [
    { id: 'bike', name: 'Bike', emoji: '🛵', hint: 'Fastest, beat the traffic', perKm: 6, base: 20, capacity: '1 seat' },
    { id: 'auto', name: 'Auto', emoji: '🛺', hint: 'Comfy 3-wheeler', perKm: 11, base: 30, capacity: '3 seats' },
    { id: 'cab', name: 'Cab', emoji: '🚗', hint: 'AC sedan, premium ride', perKm: 16, base: 60, capacity: '4 seats' },
];

export function estimateRide(distanceKm: number, optionId: string) {
    const opt = rideOptions.find((o) => o.id === optionId) || rideOptions[0];
    const price = Math.round(opt.base + distanceKm * opt.perKm);
    const etaMin = Math.max(4, Math.round(5 + distanceKm * 2.1));
    return { price, etaMin, base: opt.base, perKm: opt.perKm };
}
