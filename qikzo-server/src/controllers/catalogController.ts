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
    listBanners: asyncHandler(async (req, res) => {
        const lat = req.query.lat != null ? Number(req.query.lat) : undefined;
        const lng = req.query.lng != null ? Number(req.query.lng) : undefined;
        // When personalized (lat/lng present) skip the shared cache so each
        // user gets banners scored against their own location.
        if (lat == null || lng == null) cacheable(res, 60, 300);
        return ok(res, { items: await catalogService.listBanners({ lat, lng }) });
    }),
};

export default catalogController;
