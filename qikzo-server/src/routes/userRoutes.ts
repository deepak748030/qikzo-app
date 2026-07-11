import { Router } from 'express';
import requireAuth from '../middleware/requireAuth';
import validate from '../middleware/validate';
import userController from '../controllers/userController';
import { updateMeSchema } from '../validators/userValidators';

const router = Router();
router.patch('/me', requireAuth, validate(updateMeSchema), userController.updateMe);
router.delete('/me', requireAuth, userController.deleteMe);
export default router;
