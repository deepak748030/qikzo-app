import asyncHandler from '../middleware/asyncHandler';
import placeService from '../services/placeService';
import { ok, created } from '../lib/http';

export const placeController = {
    list: asyncHandler(async (req, res) => ok(res, { items: await placeService.list(req.user!.id) })),
    create: asyncHandler(async (req, res) => created(res, { place: await placeService.create(req.user!.id, req.body) })),
    update: asyncHandler(async (req, res) =>
        ok(res, { place: await placeService.update(req.user!.id, req.params.id, req.body) }, 'Updated')),
    remove: asyncHandler(async (req, res) => {
        await placeService.remove(req.user!.id, req.params.id);
        return ok(res, {}, 'Deleted');
    }),
};

export default placeController;
