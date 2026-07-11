import { Router } from 'express';
import requireAuth from '../middleware/requireAuth';
import validate from '../middleware/validate';
import placeController from '../controllers/placeController';
import { createPlaceSchema } from '../validators/userValidators';

const router = Router();
router.get('/', requireAuth, placeController.list);
router.post('/', requireAuth, validate(createPlaceSchema), placeController.create);
router.delete('/:id', requireAuth, placeController.remove);
export default router;
