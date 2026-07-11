import asyncHandler from '../middleware/asyncHandler';
import catalogService from '../services/catalogService';
import { ok } from '../lib/http';

export const catalogController = {
    listCategories: asyncHandler(async (_req, res) => ok(res, { items: await catalogService.listCategories() })),
    listBanners: asyncHandler(async (_req, res) => ok(res, { items: await catalogService.listBanners() })),
};

export default catalogController;
