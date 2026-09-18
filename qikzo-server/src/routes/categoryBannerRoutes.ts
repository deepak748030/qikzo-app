import { Router } from 'express';
import validate from '../middleware/validate';
import categoryBannerController from '../controllers/categoryBannerController';
import { bannerListQuerySchema } from '../validators/bannerAdminValidators';

/**
 * Public Food/Grocery banner endpoints for the customer app.
 *
 * Unauthenticated on purpose — identical posture to the existing public
 * catalog routes (`GET /categories`, `GET /banners`), so the Food/Grocery
 * screens stay browsable before sign-in.
 *
 * Mounted at `/category-banners`, which does not collide with the existing
 * `/banners` route registered by catalogRoutes.
 */
const router = Router();

router.get('/', validate(bannerListQuerySchema, 'query'), categoryBannerController.listForTab);
router.get('/:id', categoryBannerController.detail);
router.get('/:id/reviews', categoryBannerController.reviews);

export default router;
