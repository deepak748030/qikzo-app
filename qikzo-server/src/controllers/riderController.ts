import asyncHandler from '../middleware/asyncHandler';
import riderService from '../services/riderService';
import tripService from '../services/tripService';
import { ok, created } from '../lib/http';

export const riderController = {
    // ---------- Public (customer app) ----------
    listAvailable: asyncHandler(async (_req, res) =>
        ok(res, { items: await riderService.listAvailable() })
    ),

    nearby: asyncHandler(async (req, res) => {
        const lng = Number(req.query.lng);
        const lat = Number(req.query.lat);
        const radiusM = req.query.radiusM ? Number(req.query.radiusM) : 5000;
        const limit = req.query.limit ? Number(req.query.limit) : 20;
        const items = await riderService.nearby(lng, lat, radiusM, limit);
        return ok(res, { items });
    }),

    getPublic: asyncHandler(async (req, res) =>
        ok(res, { rider: await riderService.getPublic(req.params.id) })
    ),

    // ---------- Self-service (rider app) ----------
    me: asyncHandler(async (req, res) => {
        const rider = await riderService.me(req.user!.id);
        return ok(res, { rider });
    }),

    updateStatus: asyncHandler(async (req, res) => {
        const rider = await riderService.updateStatus(req.user!.id, req.body);
        return ok(res, { rider }, 'Status updated');
    }),

    updateLocation: asyncHandler(async (req, res) => {
        const rider = await riderService.updateLocation(req.user!.id, req.body);
        return ok(res, { rider });
    }),

    updateVehicle: asyncHandler(async (req, res) => {
        const rider = await riderService.updateVehicle(req.user!.id, req.body);
        return ok(res, { rider }, 'Vehicle updated');
    }),

    incoming: asyncHandler(async (req, res) => {
        const radiusM = req.query.radiusM ? Number(req.query.radiusM) : undefined;
        const limit = req.query.limit ? Number(req.query.limit) : undefined;
        const items = await riderService.incoming(req.user!.id, { radiusM, limit });
        return ok(res, { items });
    }),

    // ---------- Booking accept / decline ----------
    acceptBooking: asyncHandler(async (req, res) => {
        const trip = await tripService.acceptBooking(req.user!.id, req.params.id);
        return created(res, { trip }, 'Booking accepted');
    }),

    declineBooking: asyncHandler(async (req, res) => {
        await tripService.declineBooking(req.user!.id, req.params.id, req.body?.reason);
        return ok(res, {}, 'Booking declined');
    }),
};

export default riderController;
