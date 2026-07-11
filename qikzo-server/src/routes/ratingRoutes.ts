import { Router } from 'express';
import requireAuth from '../middleware/requireAuth';
import validate from '../middleware/validate';
import asyncHandler from '../middleware/asyncHandler';
import { ok, created } from '../lib/http';
import ratingService from '../services/ratingService';
import { submitRatingSchema } from '../validators/ratingValidators';

const router = Router();

/**
 * Ratings — customer submits after `Delivered`; single rating per booking.
 * Public read for a rider's rating history sits under /riders/:id/ratings.
 */
router.post(
    '/',
    requireAuth,
    validate(submitRatingSchema),
    asyncHandler(async (req, res) => {
        const rating = await ratingService.submit(req.user!.id, req.body);
        return created(res, { rating }, 'Rating submitted');
    }),
);

router.get(
    '/booking/:id',
    requireAuth,
    asyncHandler(async (req, res) => {
        const rating = await ratingService.getForBooking(req.user!.id, req.params.id);
        return ok(res, { rating });
    }),
);

router.get(
    '/rider/:id',
    requireAuth,
    asyncHandler(async (req, res) => {
        const items = await ratingService.listForRider(req.params.id, req.query.limit ? Number(req.query.limit) : undefined);
        return ok(res, { items });
    }),
);

export default router;
