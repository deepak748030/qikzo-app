import { Router } from 'express';
import requireAuth from '../middleware/requireAuth';
import validate from '../middleware/validate';
import notificationController from '../controllers/notificationController';

const router = Router();

router.get('/', requireAuth, notificationController.list);
router.post('/', requireAuth, notificationController.create);
router.post('/read-all', requireAuth, notificationController.markAllRead);
router.patch('/:id/read', requireAuth, notificationController.markRead);
router.delete('/:id', requireAuth, notificationController.remove);

export default router;
