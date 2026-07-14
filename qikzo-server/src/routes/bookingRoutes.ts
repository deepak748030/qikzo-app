import { Router } from 'express';
import requireAuth from '../middleware/requireAuth';
import validate from '../middleware/validate';
import bookingController from '../controllers/bookingController';
import { bookingCreateLimiter } from '../middleware/rateLimiters';
import { idempotency } from '../middleware/idempotency';
import { estimateSchema, createBookingSchema, updateStatusSchema, cancelSchema } from '../validators/bookingValidators';

const router = Router();

router.post('/estimate', requireAuth, validate(estimateSchema), bookingController.estimate);
router.post('/', requireAuth, bookingCreateLimiter, idempotency(), validate(createBookingSchema), bookingController.create);
router.get('/', requireAuth, bookingController.listMine);
router.get('/:id', requireAuth, bookingController.getOne);
router.patch('/:id/status', requireAuth, validate(updateStatusSchema), bookingController.updateStatus);
router.get('/:id/cancel-quote', requireAuth, bookingController.quoteCancel);
router.post('/:id/cancel', requireAuth, validate(cancelSchema), bookingController.cancel);
router.post('/:id/rider-cancel', requireAuth, validate(cancelSchema), bookingController.riderCancel);
router.post('/:id/confirm-payment', requireAuth, bookingController.confirmPayment);
router.post('/:id/dispute-payment', requireAuth, bookingController.disputePayment);

export default router;
