const asyncHandler = require('../middleware/asyncHandler');
const Rider = require('../models/Rider');
const { ok } = require('../utils/response');

// GET /api/riders/available
exports.listAvailable = asyncHandler(async (_req, res) => {
    const items = await Rider.find({ online: true, available: true })
        .sort({ rating: -1 })
        .limit(50)
        .lean();
    return ok(res, { items });
});
