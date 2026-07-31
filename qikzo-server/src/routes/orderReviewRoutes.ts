import { Router } from 'express';
import requireAuth from '../middleware/requireAuth';
import validate from '../middleware/validate';
import asyncHandler from '../middleware/asyncHandler';
import { ok, created } from '../lib/http';
import orderReviewService from '../services/orderReviewService';
import { submitOrderReviewSchema } from '../validators/orderReviewValidators';

const router = Router();

/**
 * Order reviews — customer rates the delivered items (food, medicines, …).
 * Separate from the rider rating at /ratings.
 */
router.post(
    '/',
    requireAuth,
    validate(submitOrderReviewSchema),
    asyncHandler(async (req, res) => {
        const review = await orderReviewService.submit(req.user!.id, req.body);
        return created(res, { review }, 'Review submitted');
    }),
);

router.get(
    '/me',
    requireAuth,
    asyncHandler(async (req, res) => {
        const items = await orderReviewService.listMine(
            req.user!.id,
            req.query.limit ? Number(req.query.limit) : undefined,
        );
        return ok(res, { items });
    }),
);

router.get(
    '/summary',
    requireAuth,
    asyncHandler(async (req, res) => {
        const items = await orderReviewService.summary(
            typeof req.query.categorySlug === 'string' ? req.query.categorySlug : undefined,
        );
        return ok(res, { items });
    }),
);

router.get(
    '/booking/:id',
    requireAuth,
    asyncHandler(async (req, res) => {
        const review = await orderReviewService.getForBooking(req.user!.id, req.params.id);
        return ok(res, { review });
    }),
);

export default router;
