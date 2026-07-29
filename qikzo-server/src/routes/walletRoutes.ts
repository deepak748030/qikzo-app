import { Router } from 'express';
import requireAuth from '../middleware/requireAuth';
import walletController from '../controllers/walletController';

const router = Router();

router.get('/summary', requireAuth, walletController.summary);
router.get('/transactions', requireAuth, walletController.transactions);
router.post('/topup', requireAuth, walletController.topup);

export default router;
