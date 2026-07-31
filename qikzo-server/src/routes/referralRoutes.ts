import { Router } from 'express';
import requireAuth from '../middleware/requireAuth';
import referralController from '../controllers/referralController';

const router = Router();

router.get('/config', requireAuth, referralController.config);
router.get('/me', requireAuth, referralController.me);
router.post('/apply', requireAuth, referralController.apply);

export default router;
