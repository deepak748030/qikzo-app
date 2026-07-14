import rateLimit from 'express-rate-limit';
import type { Request } from 'express';

const std = (windowMs: number, max: number, code: string, message: string) =>
    rateLimit({
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        handler: (_req, res) => res.status(429).json({ success: false, code, message }),
    });

/** Key by authenticated user id when available, fall back to IP. */
const userOrIp = (req: Request) =>
    String((req as any).user?.id || (req as any).user?._id || req.ip || 'anon');

/** Global soft cap — applies to every /api request. */
export const globalLimiter = std(60_000, 300, 'RATE_LIMITED', 'Too many requests, slow down');

/** OTP request/verify — burst-protected. */
export const otpLimiter = std(60_000, 5, 'OTP_RATE_LIMITED', 'Too many OTP requests, try again in a minute');

/** Auth-adjacent (refresh, login, etc.). */
export const authLimiter = std(60_000, 30, 'AUTH_RATE_LIMITED', 'Too many auth requests');

/**
 * Booking-create limiter — per authenticated USER (not per IP), so a shared
 * NAT gateway (office wifi, cafe) doesn't get everyone throttled by one
 * spammy client. 5 bookings/min is well past any legitimate flow.
 */
export const bookingCreateLimiter = rateLimit({
    windowMs: 60_000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: userOrIp,
    handler: (_req, res) => res.status(429).json({
        success: false,
        code: 'BOOKING_RATE_LIMITED',
        message: 'Too many bookings, slow down',
    }),
});
