import mongoose from 'mongoose';
import KYC from '../models/KYC';
import Rider from '../models/Rider';
import User from '../models/User';
import Document from '../models/Document';
import Payout from '../models/Payout';
import Wallet from '../models/Wallet';
import Booking, { BOOKING_STATUSES } from '../models/Booking';
import Coupon from '../models/Coupon';
import PromoBanner from '../models/PromoBanner';
import SavedPlace from '../models/SavedPlace';
import Address from '../models/Address';
import Trip from '../models/Trip';
import Rating from '../models/Rating';
import OrderReview from '../models/OrderReview';
import Payment from '../models/Payment';
import Vehicle from '../models/Vehicle';
import EmergencyContact from '../models/EmergencyContact';
import { errors } from '../lib/errors';
import notificationService from './notificationService';
import { audit } from './auditService';
import { emitKycUpdate } from '../sockets';

/** Admin list historically used snake_case chips; bookings store human labels. */
const BOOKING_STATUS_ALIASES: Record<string, string> = {
    created: 'Scheduled',
    scheduled: 'Scheduled',
    searching: 'Searching rider',
    accepted: 'Rider accepted',
    arrived: 'Arriving for pickup',
    arriving: 'Arriving for pickup',
    picked_up: 'Picked up',
    pickedup: 'Picked up',
    in_progress: 'On the way',
    on_the_way: 'On the way',
    completed: 'Delivered',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    canceled: 'Cancelled',
};

function resolveBookingStatus(raw?: string) {
    if (!raw) return undefined;
    const trimmed = String(raw).trim();
    if ((BOOKING_STATUSES as readonly string[]).includes(trimmed)) return trimmed;
    return BOOKING_STATUS_ALIASES[trimmed.toLowerCase().replace(/[\s-]+/g, '_')] || trimmed;
}

function slimPoint(p: any) {
    if (!p || typeof p !== 'object') return p;
    const { location, ...rest } = p;
    return rest;
}

/**
 * Banners are geo-targeted by picking a Category → State → Area. The area's
 * polygon is copied onto the banner and its centroid becomes the map pin, so
 * admins never type latitude/longitude by hand.
 */
function resolveBannerGeo(input: any) {
    const ring: [number, number][] | undefined =
        input?.polygon?.coordinates?.[0] ?? (Array.isArray(input?.polygon?.coordinates?.[0]?.[0]) ? undefined : input?.polygon?.coordinates);
    const out: any = {
        categoryId: input.categoryId || null,
        categorySlug: String(input.categorySlug || '').trim().toLowerCase(),
        stateId: String(input.stateId || ''),
        stateName: String(input.stateName || ''),
        areaId: String(input.areaId || ''),
        areaName: String(input.areaName || ''),
    };

    if (Array.isArray(ring) && ring.length >= 3) {
        const pts = ring.map((p) => [Number(p[0]), Number(p[1])] as [number, number]);
        if (pts.some(([lng, lat]) => !Number.isFinite(lng) || !Number.isFinite(lat))) {
            throw errors.badRequest('Invalid polygon point', 'POINT_INVALID');
        }
        const [fx, fy] = pts[0];
        const [lx, ly] = pts[pts.length - 1];
        if (fx !== lx || fy !== ly) pts.push([fx, fy]);
        const uniq = pts.slice(0, -1);
        out.polygon = { type: 'Polygon', coordinates: [pts] };
        out.coord = {
            lat: uniq.reduce((s, p) => s + p[1], 0) / uniq.length,
            lng: uniq.reduce((s, p) => s + p[0], 0) / uniq.length,
        };
        return out;
    }

    const lat = Number(input?.coord?.lat);
    const lng = Number(input?.coord?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw errors.badRequest('Select a service area on the map', 'AREA_REQUIRED');
    }
    out.coord = { lat, lng };
    return out;
}

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
        const status = resolveBookingStatus(opts.status);
        if (status) filter.status = status;
        if (opts.cursor) filter._id = { $lt: opts.cursor };
        const rows = await Booking.find(filter)
            .sort({ _id: -1 })
            .limit(limit + 1)
            .select('code status mode categorySlug vehicleTypeSlug pickup.address extraPickups.address drop.address price payment paymentStatus createdAt user rider')
            .populate({ path: 'user', select: 'name phone email avatarUrl' })
            .populate({ path: 'rider', select: 'name phone vehicle vehicleNo' })
            .lean();
        const hasMore = rows.length > limit;
        const items = rows.slice(0, limit).map((b: any) => ({
            ...b,
            customer: b.user || null,
            fare: { total: Math.round(Number(b.price || 0) * 100) },
        }));
        return {
            items,
            nextCursor: hasMore ? String(rows[limit - 1]._id) : null,
        };
    },

    async getBooking(id: string) {
        if (!mongoose.isValidObjectId(id)) throw errors.notFound('Booking not found', 'BOOKING_NOT_FOUND');
        const booking = await Booking.findById(id).lean();
        if (!booking) throw errors.notFound('Booking not found', 'BOOKING_NOT_FOUND');

        const userId = booking.user ? String(booking.user) : null;
        const riderId = booking.rider ? String(booking.rider) : null;

        const [
            customer,
            rider,
            customerPlaces,
            customerAddresses,
            customerEmergency,
            customerWallets,
            trip,
            rating,
            orderReview,
            payments,
            vehicle,
        ] = await Promise.all([
            userId ? User.findById(userId).lean() : null,
            riderId ? Rider.findById(riderId).lean() : null,
            userId ? SavedPlace.find({ user: userId }).sort({ createdAt: -1 }).limit(30).lean() : [],
            userId ? Address.find({ user: userId }).sort({ isDefault: -1, createdAt: -1 }).limit(30).lean() : [],
            userId ? EmergencyContact.find({ user: userId }).lean() : [],
            userId
                ? Wallet.find({ owner: userId, kind: { $in: ['customer', 'loyalty'] } })
                    .select('kind balance pending totalSpent')
                    .lean()
                : [],
            Trip.findOne({ booking: id }).select('-path').lean(),
            Rating.findOne({ booking: id }).lean(),
            OrderReview.findOne({ booking: id }).lean(),
            Payment.find({ booking: id }).sort({ createdAt: -1 }).lean(),
            riderId ? Vehicle.findOne({ rider: riderId }).sort({ primary: -1 }).lean() : null,
        ]);

        let riderUser = null;
        let riderWallet = null;
        if (rider) {
            [riderUser, riderWallet] = await Promise.all([
                rider.user
                    ? User.findById(rider.user)
                        .select('name phone email avatarUrl address city pincode blocked blockedReason lastLoginAt createdAt')
                        .lean()
                    : null,
                Wallet.findOne({ owner: rider._id, kind: 'rider' }).select('balance pending totalEarned').lean(),
            ]);
        }

        return {
            booking: {
                ...booking,
                pickup: slimPoint(booking.pickup),
                drop: slimPoint(booking.drop),
                extraPickups: Array.isArray(booking.extraPickups) ? booking.extraPickups.map(slimPoint) : [],
                user: userId,
                rider: riderId,
            },
            customer,
            customerPlaces,
            customerAddresses,
            customerEmergency,
            customerWallets,
            rider: rider
                ? { ...rider, user: riderUser, wallet: riderWallet, vehicleDoc: vehicle }
                : null,
            trip,
            rating,
            orderReview,
            payments,
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
        const geo = resolveBannerGeo(input);
        const existing = await PromoBanner.findOne({ slug });
        if (existing) throw errors.badRequest('Banner slug already exists', 'SLUG_EXISTS');
        return PromoBanner.create({
            slug,
            title,
            subtitle: String(input.subtitle || '').trim(),
            address: String(input.address || '').trim(),
            imageUrl: String(input.imageUrl || '').trim(),
            // A menu belongs only to a food pickup banner. Keeping this rule
            // server-side prevents stale hidden menu data when an admin later
            // changes the banner's category.
            menuImageUrl: geo.categorySlug === 'food'
                ? String(input.menuImageUrl || '').trim()
                : '',
            ...geo,
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
        if (typeof patch.menuImageUrl === 'string') clean.menuImageUrl = patch.menuImageUrl.trim();
        if (typeof patch.active === 'boolean') clean.active = patch.active;
        if (patch.order !== undefined && Number.isFinite(Number(patch.order))) clean.order = Number(patch.order);
        if (patch.polygon || patch.categoryId || patch.coord) {
            Object.assign(clean, resolveBannerGeo(patch));
        }
        const current = await PromoBanner.findById(id).select('categorySlug').lean();
        if (!current) throw errors.notFound('Banner not found', 'BANNER_NOT_FOUND');
        const resultingCategory = String(clean.categorySlug ?? current.categorySlug ?? '').toLowerCase();
        if (resultingCategory !== 'food') clean.menuImageUrl = '';

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
