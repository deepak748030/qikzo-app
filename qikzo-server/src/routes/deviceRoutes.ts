import { Router } from 'express';
import requireAuth from '../middleware/requireAuth';
import validate from '../middleware/validate';
import asyncHandler from '../middleware/asyncHandler';
import { ok, created } from '../lib/http';
import pushService from '../services/pushService';
import { registerDeviceSchema, unregisterDeviceSchema } from '../validators/deviceValidators';

const router = Router();

/**
 * Push-notification device registry. Called from mobile clients right after
 * `Notifications.getExpoPushTokenAsync()` resolves. Idempotent — safe to call
 * on every launch.
 */
router.post(
    '/',
    requireAuth,
    validate(registerDeviceSchema),
    asyncHandler(async (req, res) => {
        const d = await pushService.registerDevice({
            userId: req.user!.id,
            audience: req.body.audience,
            token: req.body.token,
            platform: req.body.platform,
            model: req.body.model,
            appVersion: req.body.appVersion,
        });
        return created(res, { device: d }, 'Device registered');
    }),
);

router.delete(
    '/',
    requireAuth,
    validate(unregisterDeviceSchema),
    asyncHandler(async (req, res) => {
        await pushService.unregisterDevice(req.user!.id, req.body.token);
        return ok(res, {}, 'Device unregistered');
    }),
);

export default router;
