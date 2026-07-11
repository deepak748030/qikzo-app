import asyncHandler from '../middleware/asyncHandler';
import tripService from '../services/tripService';
import { ok } from '../lib/http';
import type { TripStage } from '../models/Trip';

export const tripController = {
    // ---------- Read-side ----------
    listMine: asyncHandler(async (req, res) => {
        const limit = Number(req.query.limit) || 50;
        const items = await tripService.listMine(req.user!.id, limit);
        return ok(res, { items });
    }),

    active: asyncHandler(async (req, res) => {
        const trip = await tripService.getActive(req.user!.id);
        return ok(res, { trip });
    }),

    forBooking: asyncHandler(async (req, res) => {
        const trip = await tripService.getByBooking(req.user!.id, req.params.bookingId);
        return ok(res, { trip });
    }),

    getOne: asyncHandler(async (req, res) => {
        const trip = await tripService.getMine(req.user!.id, req.params.id);
        return ok(res, { trip });
    }),

    // ---------- Rider lifecycle mutations ----------
    setStage: asyncHandler(async (req, res) => {
        const trip = await tripService.setStage(
            req.user!.id,
            req.params.id,
            req.body.stage as TripStage
        );
        return ok(res, { trip }, 'Stage updated');
    }),

    cancel: asyncHandler(async (req, res) => {
        const trip = await tripService.cancelByRider(
            req.user!.id,
            req.params.id,
            req.body?.reason
        );
        return ok(res, { trip }, 'Trip cancelled');
    }),
};

export default tripController;
