import rateLimit from 'express-rate-limit';

const std = (windowMs: number, max: number, code: string, message: string) =>
    rateLimit({
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        handler: (_req, res) => res.status(429).json({ success: false, code, message }),
    });

/** Global soft cap — applies to every /api request. */
export const globalLimiter = std(60_000, 300, 'RATE_LIMITED', 'Too many requests, slow down');

/** OTP request/verify — burst-protected. */
export const otpLimiter = std(60_000, 5, 'OTP_RATE_LIMITED', 'Too many OTP requests, try again in a minute');

/** Auth-adjacent (refresh, login, etc.). */
export const authLimiter = std(60_000, 30, 'AUTH_RATE_LIMITED', 'Too many auth requests');

/** Booking-create — protect against spam bookings. */
export const bookingCreateLimiter = std(60_000, 30, 'BOOKING_RATE_LIMITED', 'Too many bookings, slow down');
