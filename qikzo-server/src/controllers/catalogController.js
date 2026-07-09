const asyncHandler = require('../middleware/asyncHandler');
const Category = require('../models/Category');
const PromoBanner = require('../models/PromoBanner');
const { ok } = require('../utils/response');

// GET /api/categories
exports.listCategories = asyncHandler(async (_req, res) => {
    const items = await Category.find({ active: true }).sort({ order: 1 }).lean();
    return ok(res, { items });
});

// GET /api/banners
exports.listBanners = asyncHandler(async (_req, res) => {
    const items = await PromoBanner.find({ active: true }).sort({ order: 1 }).lean();
    return ok(res, { items });
});
