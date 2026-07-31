import { Router } from 'express';
import requireAuth from '../middleware/requireAuth';
import requireAdmin from '../middleware/requireAdmin';
import validate from '../middleware/validate';
import adminController from '../controllers/adminController';
import categoryAdminController from '../controllers/categoryAdminController';
import {
    listQuerySchema,
    rejectSchema,
    approvePayoutSchema,
    blockRiderSchema,
    blockUserSchema,
    updateUserSchema,
} from '../validators/adminValidators';

/**
 * Admin backoffice routes. All mounted behind `requireAuth + requireAdmin`.
 * The role is stored on the User doc and re-checked from Mongo per request.
 */
const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/summary', adminController.summary);

// KYC review
router.get('/kyc', validate(listQuerySchema, 'query'), adminController.listKyc);
router.get('/kyc/:id', adminController.getKyc);
router.post('/kyc/:id/approve', adminController.approveKyc);
router.post('/kyc/:id/reject', validate(rejectSchema), adminController.rejectKyc);

// Payouts
router.get('/payouts', validate(listQuerySchema, 'query'), adminController.listPayouts);
router.post('/payouts/:id/approve', validate(approvePayoutSchema), adminController.approvePayout);
router.post('/payouts/:id/reject', validate(rejectSchema), adminController.rejectPayout);

// Riders
router.get('/riders', validate(listQuerySchema, 'query'), adminController.listRiders);
router.post('/riders/:id/block', validate(blockRiderSchema), adminController.setRiderBlocked);

// Users
router.get('/users', validate(listQuerySchema, 'query'), adminController.listUsers);
router.get('/users/:id', adminController.getUser);
router.patch('/users/:id', validate(updateUserSchema), adminController.updateUser);
router.post('/users/:id/block', validate(blockUserSchema), adminController.setUserBlocked);
router.delete('/users/:id', adminController.deleteUser);

// Bookings
router.get('/bookings', validate(listQuerySchema, 'query'), adminController.listBookings);

// Coupons
router.get('/coupons', validate(listQuerySchema, 'query'), adminController.listCoupons);
router.post('/coupons', adminController.createCoupon);
router.patch('/coupons/:id', adminController.updateCoupon);
router.delete('/coupons/:id', adminController.deleteCoupon);

// Categories (with States & Areas / polygons)
router.get('/categories', validate(listQuerySchema, 'query'), categoryAdminController.list);
router.post('/categories', categoryAdminController.create);
router.get('/categories/:id', categoryAdminController.get);
router.patch('/categories/:id', categoryAdminController.update);
router.delete('/categories/:id', categoryAdminController.remove);
router.post('/categories/:id/toggle', categoryAdminController.toggle);
router.post('/categories/:id/states', categoryAdminController.addState);
router.patch('/categories/:id/states/:stateId', categoryAdminController.updateState);
router.delete('/categories/:id/states/:stateId', categoryAdminController.removeState);
router.post('/categories/:id/states/:stateId/areas', categoryAdminController.addArea);
router.patch('/categories/:id/states/:stateId/areas/:areaId', categoryAdminController.updateArea);
router.delete('/categories/:id/states/:stateId/areas/:areaId', categoryAdminController.removeArea);

// Promo banners
router.get('/banners', validate(listQuerySchema, 'query'), adminController.listBanners);
router.post('/banners', adminController.createBanner);
router.patch('/banners/:id', adminController.updateBanner);
router.delete('/banners/:id', adminController.deleteBanner);

// Rewards: wallet bonus tiers + referral milestones
router.get('/reward-config', adminController.getRewardConfig);
router.patch('/reward-config', adminController.updateRewardConfig);
router.get('/referrals', adminController.listReferrals);

// Audit log
router.get('/audit', adminController.listAudit);

// Support tickets
router.get('/support', validate(listQuerySchema, 'query'), adminController.listSupport);
router.get('/support/:id', adminController.getSupport);
router.post('/support/:id/reply', adminController.replySupport);
router.patch('/support/:id/status', adminController.setSupportStatus);

export default router;
