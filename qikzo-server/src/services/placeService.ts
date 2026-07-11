import SavedPlace from '../models/SavedPlace';
import { errors } from '../lib/errors';

export const placeService = {
    list: (userId: string) => SavedPlace.find({ user: userId }).sort({ createdAt: 1 }).lean(),

    async create(userId: string, input: { label: string; address: string; emoji?: string; coord?: { lat: number; lng: number } | null }) {
        const { label, address, emoji, coord } = input;
        if (!label || !address) throw errors.badRequest('label and address are required', 'MISSING_FIELDS');
        return SavedPlace.create({
            user: userId,
            label: String(label).trim(),
            address: String(address).trim(),
            emoji: emoji || '📍',
            coord: coord && coord.lat != null && coord.lng != null ? coord : undefined,
        });
    },

    async remove(userId: string, id: string) {
        const r = await SavedPlace.findOneAndDelete({ _id: id, user: userId });
        if (!r) throw errors.notFound('Place not found', 'PLACE_NOT_FOUND');
    },
};

export default placeService;
