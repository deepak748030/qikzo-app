const asyncHandler = require('../middleware/asyncHandler');
const SavedPlace = require('../models/SavedPlace');
const { ok, created, fail } = require('../utils/response');

// GET /api/places
exports.list = asyncHandler(async (req, res) => {
    const items = await SavedPlace.find({ user: req.user.id }).sort({ createdAt: 1 }).lean();
    return ok(res, { items });
});

// POST /api/places   { label, address, emoji?, coord? }
exports.create = asyncHandler(async (req, res) => {
    const { label, address, emoji, coord } = req.body;
    if (!label || !address) return fail(res, 400, 'label and address are required');
    const place = await SavedPlace.create({
        user: req.user.id,
        label: String(label).trim(),
        address: String(address).trim(),
        emoji: emoji || '📍',
        coord: coord && coord.lat != null && coord.lng != null ? coord : undefined,
    });
    return created(res, { place });
});

// DELETE /api/places/:id
exports.remove = asyncHandler(async (req, res) => {
    const r = await SavedPlace.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!r) return fail(res, 404, 'Place not found');
    return ok(res, {}, 'Deleted');
});
