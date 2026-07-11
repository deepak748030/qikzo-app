import { Router } from 'express';
import requireAuth from '../middleware/requireAuth';
import validate from '../middleware/validate';
import asyncHandler from '../middleware/asyncHandler';
import { ok } from '../lib/http';
import couponService from '../services/couponService';
import { quoteCouponSchema } from '../validators/couponValidators';

/**
 * Coupons — customer preview + a lightweight active list. Redemption happens
 * server-side inside booking creation.
 */
const router = Router();

router.post(
    '/quote',
    requireAuth,
    validate(quoteCouponSchema),
    asyncHandler(async (req, res) => {
        const q = await couponService.quote({ userId: req.user!.id, ...req.body });
        return ok(res, {
            code: q.code,
            discount: q.discount,
            finalPrice: q.finalPrice,
            title: q.coupon.title,
            description: q.coupon.description,
        });
    }),
);

export default router;
