import asyncHandler from '../middleware/asyncHandler';
import rewardService from '../services/rewardService';
import { ok } from '../lib/http';

export const referralController = {
    /** Refer & Earn screen — code, milestones, invite list, totals. */
    me: asyncHandler(async (req, res) => {
        const data = await rewardService.getMyReferral(req.user!.id);
        return ok(res, data);
    }),

    config: asyncHandler(async (_req, res) => {
        const cfg = await rewardService.getConfig();
        return ok(res, { referral: cfg.referral });
    }),

    apply: asyncHandler(async (req, res) => {
        const data = await rewardService.applyCode(req.user!.id, String(req.body?.code || ''));
        return ok(res, data, 'Referral code applied');
    }),
};

export default referralController;
