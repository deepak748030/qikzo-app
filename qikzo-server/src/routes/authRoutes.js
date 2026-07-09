const router = require('express').Router();
const c = require('../controllers/authController');
const requireAuth = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const otpLimiter = rateLimit({
    windowMs: 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false,
    message: { success: false, message: 'Too many OTP requests, try again in a minute' },
});

router.post('/request-otp', otpLimiter, c.requestOtp);
router.post('/verify-otp', otpLimiter, c.verifyOtp);
router.get('/me', requireAuth, c.me);

module.exports = router;
