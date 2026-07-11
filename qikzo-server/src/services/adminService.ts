import KYC from '../models/KYC';
import Rider from '../models/Rider';
import User from '../models/User';
import Document from '../models/Document';
import Payout from '../models/Payout';
import Wallet from '../models/Wallet';
import Booking from '../models/Booking';
import Coupon from '../models/Coupon';
import PromoBanner from '../models/PromoBanner';
import { errors } from '../lib/errors';
import notificationService from './notificationService';
import { audit } from './auditService';
import { emitKycUpdate } from '../sockets';

/**
 * Admin backoffice service. All calls assume `requireAdmin` has already run,
 * so we never re-check the caller's role here — but we do mirror decisions
 * back onto the Rider doc + notify the affected user.
 */
export const adminService = {
    // ---------- KYC ----------
    async listKyc(opts: { status?: string; limit?: number; cursor?: string } = {}) {
        const limit = Math.min(Math.max(opts.limit ?? 30, 1), 100);
        const filter: any = {};
        if (opts.status) filter.status = opts.status;
        if (opts.cursor) filter._id = { $lt: opts.cursor };
        const items = await KYC.find(filter)
            .sort({ _id: -1 })
            .limit(limit + 1)
            .populate({ path: 'rider', select: 'name phone user vehicle vehicleNo kycStatus' })
            .populate({ path: 'documentIds', select: 'kind url mimeType status' })
            .lean();
        const hasMore = items.length > limit;
        return {
            items: items.slice(0, limit),
            nextCursor: hasMore ? String(items[limit - 1]._id) : null,
        };
    },

    async getKyc(id: string) {
        const kyc = await KYC.findById(id)
            .populate({ path: 'rider' })
            .populate({ path: 'documentIds' })
            .lean();
        if (!kyc) throw errors.notFound('KYC not found', 'KYC_NOT_FOUND');
        return kyc;
    },

    async approveKyc(adminUserId: string, id: string) {
        const kyc = await KYC.findByIdAndUpdate(
            id,
            { status: 'approved', reviewedBy: adminUserId, reviewedAt: new Date(), rejectionReason: '' },
            { new: true },
        );
        if (!kyc) throw errors.notFound('KYC not found', 'KYC_NOT_FOUND');
        const rider = await Rider.findByIdAndUpdate(kyc.rider, { kycStatus: 'approved' }, { new: true });
        await Document.updateMany({ owner: kyc.rider, ownerRole: 'rider' }, { status: 'approved' });
        if (rider?.user) {
            emitKycUpdate(String(rider.user), 'approved');
            void notificationService.emit({
                user: String(rider.user),
                audience: 'rider',
                topic: 'system',
                title: 'KYC approved',
                body: 'You can now go online and accept jobs.',
                data: { event: 'kyc:approved' },
            }).catch(() => {});
        }
        void audit({ actorId: adminUserId, actorRole: 'admin', action: 'kyc.approve', targetType: 'kyc', targetId: id, meta: { rider: String(kyc.rider) } });
        return kyc;
    },

    async rejectKyc(adminUserId: string, id: string, reason: string) {
        const kyc = await KYC.findByIdAndUpdate(
            id,
            { status: 'rejected', reviewedBy: adminUserId, reviewedAt: new Date(), rejectionReason: reason || 'Not specified' },
            { new: true },
        );
        if (!kyc) throw errors.notFound('KYC not found', 'KYC_NOT_FOUND');
        const rider = await Rider.findByIdAndUpdate(kyc.rider, { kycStatus: 'rejected' }, { new: true });
        if (rider?.user) {
            emitKycUpdate(String(rider.user), 'rejected', { reason: reason || 'Not specified' });
            void notificationService.emit({
                user: String(rider.user),
                audience: 'rider',
                topic: 'system',
                title: 'KYC rejected',
                body: reason || 'Please re-submit your documents.',
                data: { event: 'kyc:rejected', reason },
            }).catch(() => {});
        }
        void audit({ actorId: adminUserId, actorRole: 'admin', action: 'kyc.reject', targetType: 'kyc', targetId: id, meta: { reason } });
        return kyc;
    },

    // ---------- Payouts ----------
    async listPayouts(opts: { status?: string; limit?: number; cursor?: string } = {}) {
        const limit = Math.min(Math.max(opts.limit ?? 30, 1), 100);
        const filter: any = {};
        if (opts.status) filter.status = opts.status;
        if (opts.cursor) filter._id = { $lt: opts.cursor };
        const items = await Payout.find(filter)
            .sort({ _id: -1 })
            .limit(limit + 1)
            .populate({ path: 'rider', select: 'name phone user vehicle vehicleNo' })
            .lean();
        const hasMore = items.length > limit;
        return {
            items: items.slice(0, limit),
            nextCursor: hasMore ? String(items[limit - 1]._id) : null,
        };
    },

    async approvePayout(id: string, providerRef = '') {
        const p = await Payout.findById(id);
        if (!p) throw errors.notFound('Payout not found', 'PAYOUT_NOT_FOUND');
        if (p.status !== 'requested' && p.status !== 'processing') {
            throw errors.badRequest(`Payout already ${p.status}`, 'PAYOUT_TERMINAL');
        }
        const wallet = await Wallet.findOne({ owner: p.rider, kind: 'rider' });
        if (!wallet || wallet.balance < p.amount) {
            throw errors.badRequest('Insufficient balance', 'INSUFFICIENT_BALANCE');
        }
        wallet.balance -= p.amount;
        await wallet.save();
        p.status = 'paid';
        p.processedAt = new Date();
        if (providerRef) p.providerRef = providerRef;
        await p.save();
        const rider = await Rider.findById(p.rider).lean();
        if ((rider as any)?.user) {
            void notificationService.emit({
                user: String((rider as any).user),
                audience: 'rider',
                topic: 'payment',
                title: 'Payout sent',
                body: `₹${p.amount} has been paid out.`,
                data: { event: 'payout:paid', payoutId: String(p._id), amount: p.amount },
            }).catch(() => {});
        }
        void audit({ actorRole: 'admin', action: 'payout.approve', targetType: 'payout', targetId: id, meta: { amount: p.amount, providerRef } });
        return p;
    },

    async rejectPayout(id: string, reason: string) {
        const p = await Payout.findById(id);
        if (!p) throw errors.notFound('Payout not found', 'PAYOUT_NOT_FOUND');
        if (p.status === 'paid') throw errors.badRequest('Cannot reject a paid payout', 'PAYOUT_PAID');
        p.status = 'failed';
        p.failureReason = reason || 'Rejected by admin';
        p.processedAt = new Date();
        await p.save();
        const rider = await Rider.findById(p.rider).lean();
        if ((rider as any)?.user) {
            void notificationService.emit({
                user: String((rider as any).user),
                audience: 'rider',
                topic: 'payment',
                title: 'Payout rejected',
                body: p.failureReason,
                data: { event: 'payout:rejected', payoutId: String(p._id) },
            }).catch(() => {});
        }
        void audit({ actorRole: 'admin', action: 'payout.reject', targetType: 'payout', targetId: id, meta: { reason } });
        return p;
    },

    // ---------- Riders ----------
    async listRiders(opts: { q?: string; online?: boolean; kycStatus?: string; limit?: number; cursor?: string } = {}) {
        const limit = Math.min(Math.max(opts.limit ?? 30, 1), 100);
        const filter: any = {};
        if (opts.online !== undefined) filter.online = opts.online;
        if (opts.kycStatus) filter.kycStatus = opts.kycStatus;
        if (opts.q) {
            const rx = new RegExp(opts.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            filter.$or = [{ name: rx }, { phone: rx }, { vehicleNo: rx }];
        }
        if (opts.cursor) filter._id = { $lt: opts.cursor };
        const items = await Rider.find(filter).sort({ _id: -1 }).limit(limit + 1).lean();
        const hasMore = items.length > limit;
        return {
            items: items.slice(0, limit),
            nextCursor: hasMore ? String(items[limit - 1]._id) : null,
        };
    },

    async setRiderBlocked(id: string, blocked: boolean, reason = '') {
        const rider = await Rider.findByIdAndUpdate(
            id,
            blocked
                ? { online: false, available: false, kycStatus: 'rejected' }
                : { available: true },
            { new: true },
        );
        if (!rider) throw errors.notFound('Rider not found', 'RIDER_NOT_FOUND');
        if (rider.user) {
            if (blocked) emitKycUpdate(String(rider.user), 'rejected', { reason: reason || 'Account suspended' });
            void notificationService.emit({
                user: String(rider.user),
                audience: 'rider',
                topic: 'system',
                title: blocked ? 'Account suspended' : 'Account reinstated',
                body: blocked ? (reason || 'Contact support for details.') : 'You can accept jobs again.',
                data: { event: blocked ? 'rider:blocked' : 'rider:unblocked' },
            }).catch(() => {});
        }
        void audit({ actorRole: 'admin', action: blocked ? 'rider.block' : 'rider.unblock', targetType: 'rider', targetId: id, meta: { reason } });
        return rider;
    },

    // ---------- Bookings ----------
    async listBookings(opts: { status?: string; limit?: number; cursor?: string } = {}) {
        const limit = Math.min(Math.max(opts.limit ?? 30, 1), 100);
        const filter: any = {};
        if (opts.status) filter.status = opts.status;
        if (opts.cursor) filter._id = { $lt: opts.cursor };
        const items = await Booking.find(filter)
            .sort({ _id: -1 })
            .limit(limit + 1)
            .populate('rider')
            .lean();
        const hasMore = items.length > limit;
        return {
            items: items.slice(0, limit),
            nextCursor: hasMore ? String(items[limit - 1]._id) : null,
        };
    },

    // ---------- Coupons ----------
    async listCoupons(opts: { active?: boolean; limit?: number; cursor?: string } = {}) {
        const limit = Math.min(Math.max(opts.limit ?? 50, 1), 100);
        const filter: any = {};
        if (opts.active !== undefined) filter.active = opts.active;
        if (opts.cursor) filter._id = { $lt: opts.cursor };
        const items = await Coupon.find(filter).sort({ _id: -1 }).limit(limit + 1).lean();
        const hasMore = items.length > limit;
        return { items: items.slice(0, limit), nextCursor: hasMore ? String(items[limit - 1]._id) : null };
    },
    async createCoupon(input: any) {
        const code = String(input.code || '').trim().toUpperCase();
        if (!code) throw errors.badRequest('Code required', 'CODE_REQUIRED');
        const existing = await Coupon.findOne({ code });
        if (existing) throw errors.badRequest('Coupon code already exists', 'CODE_EXISTS');
        return Coupon.create({ ...input, code });
    },
    async updateCoupon(id: string, patch: any) {
        const doc = await Coupon.findByIdAndUpdate(id, patch, { new: true });
        if (!doc) throw errors.notFound('Coupon not found', 'COUPON_NOT_FOUND');
        return doc;
    },
    async deleteCoupon(id: string) {
        const r = await Coupon.deleteOne({ _id: id });
        if (!r.deletedCount) throw errors.notFound('Coupon not found', 'COUPON_NOT_FOUND');
    },

    // ---------- Promo Banners ----------
    async listBanners(opts: { active?: boolean; limit?: number; cursor?: string } = {}) {
        const limit = Math.min(Math.max(opts.limit ?? 50, 1), 100);
        const filter: any = {};
        if (opts.active !== undefined) filter.active = opts.active;
        if (opts.cursor) filter._id = { $lt: opts.cursor };
        // Order by display `order` first (asc), then newest for stable pagination.
        const items = await PromoBanner.find(filter)
            .sort({ order: 1, _id: -1 })
            .limit(limit + 1)
            .lean();
        const hasMore = items.length > limit;
        return { items: items.slice(0, limit), nextCursor: hasMore ? String(items[limit - 1]._id) : null };
    },
    async createBanner(input: any) {
        const slug = String(input.slug || '').trim().toLowerCase();
        const title = String(input.title || '').trim();
        if (!slug) throw errors.badRequest('Slug required', 'SLUG_REQUIRED');
        if (!title) throw errors.badRequest('Title required', 'TITLE_REQUIRED');
        const lat = Number(input?.coord?.lat);
        const lng = Number(input?.coord?.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            throw errors.badRequest('Coordinates required', 'COORD_REQUIRED');
        }
        const existing = await PromoBanner.findOne({ slug });
        if (existing) throw errors.badRequest('Banner slug already exists', 'SLUG_EXISTS');
        return PromoBanner.create({
            slug,
            title,
            subtitle: String(input.subtitle || '').trim(),
            address: String(input.address || '').trim(),
            imageUrl: String(input.imageUrl || '').trim(),
            coord: { lat, lng },
            active: input.active !== false,
            order: Number.isFinite(Number(input.order)) ? Number(input.order) : 0,
        });
    },
    async updateBanner(id: string, patch: any) {
        const clean: any = {};
        if (typeof patch.title === 'string') clean.title = patch.title.trim();
        if (typeof patch.subtitle === 'string') clean.subtitle = patch.subtitle.trim();
        if (typeof patch.address === 'string') clean.address = patch.address.trim();
        if (typeof patch.imageUrl === 'string') clean.imageUrl = patch.imageUrl.trim();
        if (typeof patch.active === 'boolean') clean.active = patch.active;
        if (patch.order !== undefined && Number.isFinite(Number(patch.order))) clean.order = Number(patch.order);
        if (patch.coord && Number.isFinite(Number(patch.coord.lat)) && Number.isFinite(Number(patch.coord.lng))) {
            clean.coord = { lat: Number(patch.coord.lat), lng: Number(patch.coord.lng) };
        }
        const doc = await PromoBanner.findByIdAndUpdate(id, clean, { new: true });
        if (!doc) throw errors.notFound('Banner not found', 'BANNER_NOT_FOUND');
        return doc;
    },
    async deleteBanner(id: string) {
        const r = await PromoBanner.deleteOne({ _id: id });
        if (!r.deletedCount) throw errors.notFound('Banner not found', 'BANNER_NOT_FOUND');
    },

    // ---------- Users ----------
    async listUsers(opts: { q?: string; role?: string; blocked?: boolean; limit?: number; cursor?: string } = {}) {
        const limit = Math.min(Math.max(opts.limit ?? 30, 1), 100);
        const filter: any = {};
        if (opts.role) filter.role = opts.role;
        if (opts.blocked !== undefined) filter.blocked = opts.blocked;
        if (opts.q) {
            const rx = new RegExp(opts.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            filter.$or = [{ name: rx }, { phone: rx }, { email: rx }];
        }
        if (opts.cursor) filter._id = { $lt: opts.cursor };
        const items = await User.find(filter).sort({ _id: -1 }).limit(limit + 1).lean();
        const hasMore = items.length > limit;
        return {
            items: items.slice(0, limit),
            nextCursor: hasMore ? String(items[limit - 1]._id) : null,
        };
    },

    async getUser(id: string) {
        const user = await User.findById(id).lean();
        if (!user) throw errors.notFound('User not found', 'USER_NOT_FOUND');
        const [bookingsCount, rider] = await Promise.all([
            Booking.countDocuments({ user: id }),
            Rider.findOne({ user: id }).lean(),
        ]);
        return { user, bookingsCount, rider };
    },

    async setUserBlocked(adminUserId: string, id: string, blocked: boolean, reason = '') {
        const user = await User.findByIdAndUpdate(
            id,
            { blocked, blockedReason: blocked ? (reason || 'Blocked by admin') : '' },
            { new: true },
        );
        if (!user) throw errors.notFound('User not found', 'USER_NOT_FOUND');
        void notificationService.emit({
            user: id,
            audience: user.role === 'rider' ? 'rider' : 'customer',
            topic: 'system',
            title: blocked ? 'Account suspended' : 'Account reinstated',
            body: blocked ? (reason || 'Contact support for details.') : 'Your account has been restored.',
            data: { event: blocked ? 'user:blocked' : 'user:unblocked' },
        }).catch(() => {});
        void audit({ actorId: adminUserId, actorRole: 'admin', action: blocked ? 'user.block' : 'user.unblock', targetType: 'user', targetId: id, meta: { reason } });
        return user;
    },

    async updateUser(adminUserId: string, id: string, patch: { name?: string; email?: string; role?: 'customer' | 'rider' | 'admin' }) {
        const clean: any = {};
        if (typeof patch.name === 'string') clean.name = patch.name.trim();
        if (typeof patch.email === 'string') clean.email = patch.email.trim().toLowerCase();
        if (patch.role && ['customer', 'rider', 'admin'].includes(patch.role)) clean.role = patch.role;
        const user = await User.findByIdAndUpdate(id, clean, { new: true });
        if (!user) throw errors.notFound('User not found', 'USER_NOT_FOUND');
        void audit({ actorId: adminUserId, actorRole: 'admin', action: 'user.update', targetType: 'user', targetId: id, meta: clean });
        return user;
    },

    async deleteUser(adminUserId: string, id: string) {
        const user = await User.findByIdAndDelete(id);
        if (!user) throw errors.notFound('User not found', 'USER_NOT_FOUND');
        void audit({ actorId: adminUserId, actorRole: 'admin', action: 'user.delete', targetType: 'user', targetId: id });
        return { deleted: true };
    },

    async summary() {
        const SupportTicket = (await import('../models/SupportTicket')).default;
        const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
        const [
            usersTotal,
            ridersTotal,
            ridersOnline,
            kycPending,
            payoutsPending,
            bookingsToday,
            supportOpen,
            revenueAgg,
        ] = await Promise.all([
            User.countDocuments({}),
            Rider.countDocuments({}),
            Rider.countDocuments({ online: true }),
            KYC.countDocuments({ status: { $in: ['submitted', 'in_review'] } }),
            Payout.countDocuments({ status: { $in: ['requested', 'processing'] } }),
            Booking.countDocuments({ createdAt: { $gte: startOfDay } }),
            SupportTicket.countDocuments({ status: { $in: ['open', 'pending'] } }),
            Booking.aggregate([
                { $match: { createdAt: { $gte: startOfDay }, status: { $nin: ['Cancelled'] } } },
                { $group: { _id: null, gmv: { $sum: '$price' } } },
            ]),
        ]);
        const gmvToday = revenueAgg?.[0]?.gmv || 0;
        // Dashboard consumes { counts: {...}, revenueToday, gmvToday }.
        // Keep the legacy flat fields too so any older client keeps working.
        return {
            counts: {
                users: usersTotal,
                riders: ridersTotal,
                ridersOnline,
                bookingsToday,
                kycPending,
                payoutsPending,
                supportOpen,
            },
            revenueToday: gmvToday,
            gmvToday,
            // legacy flat fields
            usersTotal,
            ridersTotal,
            ridersOnline,
            kycPending,
            payoutsPending,
            bookingsToday,
        };
    },
};

export default adminService;
