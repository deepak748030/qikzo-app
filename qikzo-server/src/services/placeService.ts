import SavedPlace from '../models/SavedPlace';
import { errors } from '../lib/errors';

const MAX_PLACES = 20;

type PlaceInput = {
    label?: string;
    address?: string;
    emoji?: string;
    coord?: { lat: number; lng: number } | null;
};

export const placeService = {
    list: (userId: string) => SavedPlace.find({ user: userId }).sort({ createdAt: 1 }).lean(),

    async create(userId: string, input: { label: string; address: string; emoji?: string; coord?: { lat: number; lng: number } | null }) {
        const { label, address, emoji, coord } = input;
        if (!label || !address) throw errors.badRequest('label and address are required', 'MISSING_FIELDS');
        const count = await SavedPlace.countDocuments({ user: userId });
        if (count >= MAX_PLACES) throw errors.badRequest(`You can save up to ${MAX_PLACES} addresses`, 'PLACE_LIMIT');
        return SavedPlace.create({
            user: userId,
            label: String(label).trim(),
            address: String(address).trim(),
            emoji: emoji || '📍',
            coord: coord && coord.lat != null && coord.lng != null ? coord : undefined,
        });
    },

    async update(userId: string, id: string, input: PlaceInput) {
        const clean: Record<string, unknown> = {};
        if (typeof input.label === 'string' && input.label.trim()) clean.label = input.label.trim();
        if (typeof input.address === 'string' && input.address.trim()) clean.address = input.address.trim();
        if (typeof input.emoji === 'string') clean.emoji = input.emoji;
        if (input.coord !== undefined) {
            clean.coord = input.coord && input.coord.lat != null && input.coord.lng != null
                ? input.coord
                : { lat: null, lng: null };
        }
        if (!Object.keys(clean).length) throw errors.badRequest('Nothing to update', 'EMPTY_PATCH');
        const r = await SavedPlace.findOneAndUpdate({ _id: id, user: userId }, { $set: clean }, { new: true });
        if (!r) throw errors.notFound('Place not found', 'PLACE_NOT_FOUND');
        return r;
    },

    async remove(userId: string, id: string) {
        const r = await SavedPlace.findOneAndDelete({ _id: id, user: userId });
        if (!r) throw errors.notFound('Place not found', 'PLACE_NOT_FOUND');
    },
};

export default placeService;
