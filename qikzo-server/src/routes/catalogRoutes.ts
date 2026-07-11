import { Router } from 'express';
import catalogController from '../controllers/catalogController';

const router = Router();
router.get('/categories', catalogController.listCategories);
router.get('/banners', catalogController.listBanners);
export default router;
