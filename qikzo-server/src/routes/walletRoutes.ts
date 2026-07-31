import { Router } from 'express';
import requireAuth from '../middleware/requireAuth';
import walletController from '../controllers/walletController';

const router = Router();

router.get('/summary', requireAuth, walletController.summary);
router.get('/config', requireAuth, walletController.config);
router.get('/transactions', requireAuth, walletController.transactions);
router.get('/topup-quote', requireAuth, walletController.topupQuote);
router.post('/topup', requireAuth, walletController.topup);
router.get('/pay-quote', requireAuth, walletController.payQuote);
router.post('/pay', requireAuth, walletController.pay);

export default router;
