import { Router } from 'express';
import asyncHandler from '../middleware/asyncHandler';
import requireAuth from '../middleware/requireAuth';
import validate from '../middleware/validate';
import supportService from '../services/supportService';
import { openTicketSchema, replyTicketSchema, listTicketsQuery } from '../validators/supportValidators';
import { ok } from '../lib/http';

/**
 * Support tickets — customer & rider surface. Admin ticket management lives
 * under /admin/support.
 */
const router = Router();

router.use(requireAuth);

router.post(
    '/',
    validate(openTicketSchema),
    asyncHandler(async (req, res) => {
        const role = (req.body.role as 'customer' | 'rider') || 'customer';
        const ticket = await supportService.open({
            userId: req.user!.id,
            role,
            subject: req.body.subject,
            body: req.body.body,
            topic: req.body.topic,
            bookingId: req.body.bookingId || null,
        });
        return ok(res, { ticket }, 'Ticket opened');
    }),
);

router.get(
    '/',
    validate(listTicketsQuery, 'query'),
    asyncHandler(async (req, res) => {
        return ok(res, await supportService.listMine(req.user!.id, req.query as any));
    }),
);

router.get(
    '/:id',
    asyncHandler(async (req, res) => {
        return ok(res, await supportService.get(req.user!.id, req.params.id, false));
    }),
);

router.post(
    '/:id/reply',
    validate(replyTicketSchema),
    asyncHandler(async (req, res) => {
        const role = ((req.user as any)?.role === 'rider' ? 'rider' : 'customer') as 'customer' | 'rider';
        const out = await supportService.reply({
            userId: req.user!.id,
            role,
            ticketId: req.params.id,
            text: req.body.text,
        });
        return ok(res, out, 'Reply sent');
    }),
);

export default router;
