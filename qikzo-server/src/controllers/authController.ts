import asyncHandler from '../middleware/asyncHandler';
import authService from '../services/authService';
import { ok } from '../lib/http';

function device(req: any) {
    return {
        deviceId: req.body?.deviceId,
        userAgent: String(req.headers['user-agent'] || ''),
        ip: (req.ip || '') as string,
    };
}

export const authController = {
    requestOtp: asyncHandler(async (req, res) => {
        const data = await authService.requestOtp(String(req.body.phone || ''));
        return ok(res, data, 'OTP sent');
    }),

    verifyOtp: asyncHandler(async (req, res) => {
        const data = await authService.verifyOtp(
            String(req.body.phone || ''),
            String(req.body.code || ''),
            device(req)
        );
        return ok(res, data, 'Login successful');
    }),

    refresh: asyncHandler(async (req, res) => {
        const data = await authService.refresh(String(req.body.refreshToken || ''), device(req));
        return ok(res, data, 'Refreshed');
    }),

    logout: asyncHandler(async (req, res) => {
        const userId = (req.user as any)?.id;
        if (req.body?.all && userId) {
            const r = await authService.revokeAllForUser(userId);
            return ok(res, r, 'Logged out from all devices');
        }
        const r = await authService.revokeRefresh(req.body?.refreshToken, userId);
        return ok(res, r, 'Logged out');
    }),

    me: asyncHandler(async (req, res) => ok(res, { user: req.user })),
};

export default authController;
