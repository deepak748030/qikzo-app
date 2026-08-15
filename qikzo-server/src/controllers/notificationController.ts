import asyncHandler from '../middleware/asyncHandler';
import notificationService from '../services/notificationService';
import { ok, created } from '../lib/http';

export const notificationController = {
    list: asyncHandler(async (req, res) => {
        const { items, unread, total, hasMore } = await notificationService.list(req.user!.id, {
            limit: req.query.limit ? Number(req.query.limit) : undefined,
            skip: req.query.skip ? Number(req.query.skip) : undefined,
            unreadOnly: req.query.unreadOnly === '1' || req.query.unreadOnly === 'true',
        });
        return ok(res, { items, unread, total, hasMore });
    }),
    markRead: asyncHandler(async (req, res) => {
        const n = await notificationService.markRead(req.user!.id, req.params.id);
        return ok(res, { notification: n });
    }),
    markAllRead: asyncHandler(async (req, res) => {
        const r = await notificationService.markAllRead(req.user!.id);
        return ok(res, r);
    }),
    remove: asyncHandler(async (req, res) => {
        await notificationService.remove(req.user!.id, req.params.id);
        return ok(res, {}, 'Deleted');
    }),
    create: asyncHandler(async (req, res) => {
        // Dev helper — allows the mobile app to seed a test notification.
        const n = await notificationService.emit({
            user: req.user!.id,
            audience: req.body.audience ?? 'customer',
            topic: req.body.topic ?? 'system',
            title: req.body.title,
            body: req.body.body,
            data: req.body.data,
        });
        return created(res, { notification: n });
    }),
};

export default notificationController;
