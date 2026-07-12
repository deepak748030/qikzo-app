import asyncHandler from '../middleware/asyncHandler';
import catalogService from '../services/catalogService';
import { ok, cacheable } from '../lib/http';

export const catalogController = {
    listCategories: asyncHandler(async (_req, res) => {
        // Categories change on admin edits only; 60 s micro-cache + 5-min SWR
        // makes repeat opens of the customer home instant.
        cacheable(res, 60, 300);
        return ok(res, { items: await catalogService.listCategories() });
    }),
    listBanners: asyncHandler(async (_req, res) => {
        cacheable(res, 60, 300);
        return ok(res, { items: await catalogService.listBanners() });
    }),
};

export default catalogController;
