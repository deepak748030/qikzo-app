import { Router } from 'express';
import authController from '../controllers/authController';
import validate from '../middleware/validate';
import requireAuth from '../middleware/requireAuth';
import { otpLimiter, authLimiter } from '../middleware/rateLimiters';
import { requestOtpSchema, verifyOtpSchema, refreshSchema, logoutSchema } from '../validators/authValidators';

const router = Router();

router.post('/request-otp', otpLimiter, validate(requestOtpSchema), authController.requestOtp);
router.post('/verify-otp', otpLimiter, validate(verifyOtpSchema), authController.verifyOtp);
router.post('/refresh', authLimiter, validate(refreshSchema), authController.refresh);
router.post('/logout', authLimiter, validate(logoutSchema), requireAuth, authController.logout);
router.get('/me', requireAuth, authController.me);

export default router;
