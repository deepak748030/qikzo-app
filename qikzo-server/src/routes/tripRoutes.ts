import { Router } from 'express';
import requireAuth from '../middleware/requireAuth';
import validate from '../middleware/validate';
import tripController from '../controllers/tripController';
import { setTripStageSchema, tripCancelSchema } from '../validators/riderSelfValidators';

const router = Router();

// Read-side (customer + rider both use these — server scopes by req.user.id).
router.get('/', requireAuth, tripController.listMine);
router.get('/active', requireAuth, tripController.active);
router.get('/by-booking/:bookingId', requireAuth, tripController.forBooking);
router.get('/:id', requireAuth, tripController.getOne);

// Rider-only lifecycle mutations (server verifies the trip belongs to caller).
router.patch('/:id/stage', requireAuth, validate(setTripStageSchema), tripController.setStage);
router.post('/:id/cancel', requireAuth, validate(tripCancelSchema), tripController.cancel);

export default router;
