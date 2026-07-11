import { Router } from 'express';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import catalogRoutes from './catalogRoutes';
import placeRoutes from './placeRoutes';
import bookingRoutes from './bookingRoutes';
import riderRoutes from './riderRoutes';
import tripRoutes from './tripRoutes';
import notificationRoutes from './notificationRoutes';
import deviceRoutes from './deviceRoutes';
import adminRoutes from './adminRoutes';
import ratingRoutes from './ratingRoutes';
import couponRoutes from './couponRoutes';
import uploadRoutes from './uploadRoutes';
import supportRoutes from './supportRoutes';
import bootstrapRoutes from './bootstrapRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/', catalogRoutes);
router.use('/places', placeRoutes);
router.use('/bookings', bookingRoutes);
router.use('/riders', riderRoutes);
router.use('/trips', tripRoutes);
router.use('/notifications', notificationRoutes);
router.use('/devices', deviceRoutes);
router.use('/admin', adminRoutes);
router.use('/ratings', ratingRoutes);
router.use('/coupons', couponRoutes);
router.use('/uploads', uploadRoutes);
router.use('/support', supportRoutes);
router.use('/admin-bootstrap', bootstrapRoutes);

export default router;
