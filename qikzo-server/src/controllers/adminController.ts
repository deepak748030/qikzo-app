import asyncHandler from '../middleware/asyncHandler';
import adminService from '../services/adminService';
import supportService from '../services/supportService';
import AuditLog from '../models/AuditLog';
import rewardService from '../services/rewardService';
import auditService from '../services/auditService';
import { ok } from '../lib/http';

/**
 * Admin controller. Every handler assumes `requireAuth` + `requireAdmin` have
 * already run, so `req.user.id` is a validated admin.
 */
export const adminController = {
    summary: asyncHandler(async (_req, res) => ok(res, await adminService.summary())),

    // KYC
    listKyc: asyncHandler(async (req, res) => ok(res, await adminService.listKyc({
        status: req.query.status as any,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        cursor: req.query.cursor as any,
    }))),
    getKyc: asyncHandler(async (req, res) => ok(res, { kyc: await adminService.getKyc(req.params.id) })),
    approveKyc: asyncHandler(async (req, res) => ok(res, { kyc: await adminService.approveKyc(req.user!.id, req.params.id) }, 'KYC approved')),
    rejectKyc: asyncHandler(async (req, res) => ok(res, { kyc: await adminService.rejectKyc(req.user!.id, req.params.id, req.body.reason || '') }, 'KYC rejected')),

    // Payouts
    listPayouts: asyncHandler(async (req, res) => ok(res, await adminService.listPayouts({
        status: req.query.status as any,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        cursor: req.query.cursor as any,
    }))),
    approvePayout: asyncHandler(async (req, res) => ok(res, { payout: await adminService.approvePayout(req.params.id, req.body.providerRef) }, 'Payout marked paid')),
    rejectPayout: asyncHandler(async (req, res) => ok(res, { payout: await adminService.rejectPayout(req.params.id, req.body.reason || '') }, 'Payout rejected')),

    // Riders
    listRiders: asyncHandler(async (req, res) => ok(res, await adminService.listRiders({
        q: req.query.q as any,
        online: req.query.online === undefined ? undefined : req.query.online === 'true',
        kycStatus: req.query.kycStatus as any,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        cursor: req.query.cursor as any,
    }))),
    setRiderBlocked: asyncHandler(async (req, res) => ok(res, { rider: await adminService.setRiderBlocked(req.params.id, !!req.body.blocked, req.body.reason || '') }, 'Rider updated')),

    // Users
    listUsers: asyncHandler(async (req, res) => ok(res, await adminService.listUsers({
        q: req.query.q as any,
        role: req.query.role as any,
        blocked: req.query.blocked === undefined ? undefined : req.query.blocked === 'true',
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        cursor: req.query.cursor as any,
    }))),
    getUser: asyncHandler(async (req, res) => ok(res, await adminService.getUser(req.params.id))),
    updateUser: asyncHandler(async (req, res) => ok(res, { user: await adminService.updateUser(req.user!.id, req.params.id, req.body) }, 'User updated')),
    setUserBlocked: asyncHandler(async (req, res) => ok(res, { user: await adminService.setUserBlocked(req.user!.id, req.params.id, !!req.body.blocked, req.body.reason || '') }, 'User updated')),
    deleteUser: asyncHandler(async (req, res) => ok(res, await adminService.deleteUser(req.user!.id, req.params.id), 'User deleted')),

    // Bookings
    listBookings: asyncHandler(async (req, res) => ok(res, await adminService.listBookings({
        status: req.query.status as any,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        cursor: req.query.cursor as any,
    }))),

    // Coupons
    listCoupons: asyncHandler(async (req, res) => ok(res, await adminService.listCoupons({
        active: req.query.active === undefined ? undefined : req.query.active === 'true',
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        cursor: req.query.cursor as any,
    }))),
    createCoupon: asyncHandler(async (req, res) => ok(res, { coupon: await adminService.createCoupon(req.body) }, 'Coupon created')),
    updateCoupon: asyncHandler(async (req, res) => ok(res, { coupon: await adminService.updateCoupon(req.params.id, req.body) }, 'Coupon updated')),
    deleteCoupon: asyncHandler(async (req, res) => {
        await adminService.deleteCoupon(req.params.id);
        return ok(res, {}, 'Coupon deleted');
    }),

    // Promo Banners
    listBanners: asyncHandler(async (req, res) => ok(res, await adminService.listBanners({
        active: req.query.active === undefined ? undefined : req.query.active === 'true',
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        cursor: req.query.cursor as any,
    }))),
    createBanner: asyncHandler(async (req, res) => ok(res, { banner: await adminService.createBanner(req.body) }, 'Banner created')),
    updateBanner: asyncHandler(async (req, res) => ok(res, { banner: await adminService.updateBanner(req.params.id, req.body) }, 'Banner updated')),
    deleteBanner: asyncHandler(async (req, res) => {
        await adminService.deleteBanner(req.params.id);
        return ok(res, {}, 'Banner deleted');
    }),

    // Audit log
    listAudit: asyncHandler(async (req, res) => {
        const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
        const filter: any = {};
        if (req.query.action) filter.action = req.query.action;
        if (req.query.actorId) filter.actorId = req.query.actorId;
        if (req.query.cursor) filter._id = { $lt: req.query.cursor };
        const items = await AuditLog.find(filter).sort({ _id: -1 }).limit(limit + 1).lean();
        const hasMore = items.length > limit;
        return ok(res, {
            items: items.slice(0, limit),
            nextCursor: hasMore ? String(items[limit - 1]._id) : null,
        });
    }),

    // Rewards (wallet bonus + referral programme)
    getRewardConfig: asyncHandler(async (_req, res) => ok(res, await rewardService.getConfig())),
    updateRewardConfig: asyncHandler(async (req, res) => {
        const config = await rewardService.updateConfig(req.body || {});
        void auditService.audit({
            actorId: req.user!.id,
            actorRole: 'admin',
            action: 'reward_config.update',
            targetType: 'RewardConfig',
            targetId: 'default',
            meta: req.body || {},
        }).catch(() => {});
        return ok(res, config, 'Reward settings saved');
    }),
    listReferrals: asyncHandler(async (req, res) => ok(res, await rewardService.listReferrals({
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        q: req.query.q ? String(req.query.q) : undefined,
    }))),

    // Support tickets
    listSupport: asyncHandler(async (req, res) => ok(res, await supportService.listAdmin({
        status: req.query.status as any,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        cursor: req.query.cursor as any,
    }))),
    getSupport: asyncHandler(async (req, res) => ok(res, await supportService.get(req.user!.id, req.params.id, true))),
    replySupport: asyncHandler(async (req, res) => ok(res, await supportService.reply({
        userId: req.user!.id, role: 'admin', ticketId: req.params.id, text: req.body.text,
    }), 'Reply sent')),
    setSupportStatus: asyncHandler(async (req, res) => ok(res, {
        ticket: await supportService.setStatus(req.user!.id, req.params.id, req.body.status),
    }, 'Ticket updated')),
};

export default adminController;
