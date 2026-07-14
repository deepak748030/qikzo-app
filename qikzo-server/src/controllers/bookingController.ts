import asyncHandler from '../middleware/asyncHandler';
import bookingService from '../services/bookingService';
import { ok, created } from '../lib/http';
import type { BookingStatus } from '../models/Booking';

export const bookingController = {
    estimate: asyncHandler(async (req, res) => {
        const { pickup, drop, pickupCoord, dropCoord } = req.body;
        const est = bookingService.estimate({
            pickup: typeof pickup === 'string' ? pickup : pickup.address,
            drop: typeof drop === 'string' ? drop : drop.address,
            pickupCoord: pickupCoord || (typeof pickup === 'object' && pickup?.lat != null ? { lat: pickup.lat, lng: pickup.lng } : null),
            dropCoord: dropCoord || (typeof drop === 'object' && drop?.lat != null ? { lat: drop.lat, lng: drop.lng } : null),
        });
        return ok(res, est);
    }),

    create: asyncHandler(async (req, res) => {
        const booking = await bookingService.create({ userId: req.user!.id, ...req.body });
        return created(res, { booking });
    }),

    listMine: asyncHandler(async (req, res) => {
        const items = await bookingService.listMine(req.user!.id);
        return ok(res, { items });
    }),

    getOne: asyncHandler(async (req, res) => {
        const booking = await bookingService.getOne(req.user!.id, req.params.id);
        return ok(res, { booking });
    }),

    updateStatus: asyncHandler(async (req, res) => {
        const booking = await bookingService.updateStatus(
            req.user!.id,
            req.params.id,
            req.body.status as BookingStatus,
            req.body.note
        );
        return ok(res, { booking }, 'Status updated');
    }),

    cancel: asyncHandler(async (req, res) => {
        const booking = await bookingService.cancel(req.user!.id, req.params.id, req.body?.reason);
        return ok(res, { booking }, 'Booking cancelled');
    }),

    quoteCancel: asyncHandler(async (req, res) => {
        return ok(res, await bookingService.quoteCancellation(req.user!.id, req.params.id));
    }),

    riderCancel: asyncHandler(async (req, res) => {
        const booking = await bookingService.riderCancel(req.user!.id, req.params.id, req.body?.reason);
        return ok(res, { booking }, 'Booking cancelled by rider');
    }),

    confirmPayment: asyncHandler(async (req, res) => {
        const booking = await bookingService.confirmPayment(req.user!.id, req.params.id);
        return ok(res, { booking }, 'Payment confirmed');
    }),

    disputePayment: asyncHandler(async (req, res) => {
        const booking = await bookingService.disputePayment(req.user!.id, req.params.id, req.body?.reason);
        return ok(res, { booking }, 'Payment disputed');
    }),
};

export default bookingController;
