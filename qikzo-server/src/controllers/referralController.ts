import asyncHandler from '../middleware/asyncHandler';
import rewardService from '../services/rewardService';
import { ok } from '../lib/http';
import { errors } from '../lib/errors';

/** Refer & Earn is a delivery-partner-only programme — customers have none. */
function assertRider(req: any) {
    if (req.user?.role !== 'rider') {
        throw errors.forbidden('Referrals are available to delivery partners only', 'RIDER_ONLY');
    }
}

export const referralController = {
    /** Refer & Earn screen — code, milestones, invite list, totals. */
    me: asyncHandler(async (req, res) => {
        assertRider(req);
        const data = await rewardService.getMyReferral(req.user!.id);
        return ok(res, data);
    }),

    config: asyncHandler(async (req, res) => {
        assertRider(req);
        const cfg = await rewardService.getConfig();
        return ok(res, { referral: cfg.referral });
    }),

    apply: asyncHandler(async (req, res) => {
        assertRider(req);
        const data = await rewardService.applyCode(req.user!.id, String(req.body?.code || ''));
        return ok(res, data, 'Referral code applied');
    }),
};

export default referralController;
