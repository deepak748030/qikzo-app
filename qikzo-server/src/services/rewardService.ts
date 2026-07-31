import crypto from 'crypto';
import RewardConfig from '../models/RewardConfig';
import Referral from '../models/Referral';
import User from '../models/User';
import Booking from '../models/Booking';
import { errors } from '../lib/errors';
import { bonusForTopup as calcBonusForTopup, milestonesDue, pendingReward } from './rewardMath';

/**
 * Reward service — the single source of truth for wallet bonus rules and the
 * Refer & Earn programme. Everything admin-tunable lives in `RewardConfig`;
 * no reward number is ever accepted from a client.
 */

export type PublicRewardConfig = {
    bonus: {
        enabled: boolean;
        tiers: { minAmount: number; type: 'percent' | 'flat'; value: number; maxBonus: number }[];
        maxUsagePct: number;
        minTopup: number;
        maxTopup: number;
    };
    referral: {
        enabled: boolean;
        milestones: { deliveries: number; reward: number }[];
        rewardWallet: 'money' | 'bonus';
        refereeSignupReward: number;
        refereeRewardWallet: 'money' | 'bonus';
        terms: string;
    };
};

function toPublic(c: any): PublicRewardConfig {
    const tiers = (c.bonus?.tiers || [])
        .map((t: any) => ({
            minAmount: Number(t.minAmount) || 0,
            type: (t.type === 'flat' ? 'flat' : 'percent') as 'percent' | 'flat',
            value: Number(t.value) || 0,
            maxBonus: Number(t.maxBonus) || 0,
        }))
        .sort((a: any, b: any) => a.minAmount - b.minAmount);
    const milestones = (c.referral?.milestones || [])
        .map((m: any) => ({ deliveries: Number(m.deliveries) || 0, reward: Number(m.reward) || 0 }))
        .sort((a: any, b: any) => a.deliveries - b.deliveries);
    return {
        bonus: {
            enabled: c.bonus?.enabled !== false,
            tiers,
            maxUsagePct: Number(c.bonus?.maxUsagePct ?? 10),
            minTopup: Number(c.bonus?.minTopup ?? 10),
            maxTopup: Number(c.bonus?.maxTopup ?? 100000),
        },
        referral: {
            enabled: c.referral?.enabled !== false,
            milestones,
            rewardWallet: c.referral?.rewardWallet === 'bonus' ? 'bonus' : 'money',
            refereeSignupReward: Number(c.referral?.refereeSignupReward ?? 0),
            refereeRewardWallet: c.referral?.refereeRewardWallet === 'money' ? 'money' : 'bonus',
            terms: String(c.referral?.terms || ''),
        },
    };
}

function genCode(name: string): string {
    const base = String(name || 'QIK')
        .toUpperCase()
        .replace(/[^A-Z]/g, '')
        .slice(0, 4)
        .padEnd(3, 'Q');
    const rand = crypto.randomBytes(4).toString('hex').toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 5);
    return `${base}${rand}`.slice(0, 10);
}

export const rewardService = {
    async getConfig(): Promise<PublicRewardConfig> {
        const c = await RewardConfig.getSingleton();
        return toPublic(c);
    },

    /** Admin update — deep-merges the two sections and validates every number. */
    async updateConfig(patch: any): Promise<PublicRewardConfig> {
        const c = await RewardConfig.getSingleton();
        const b = patch?.bonus;
        if (b) {
            if (typeof b.enabled === 'boolean') (c.bonus as any).enabled = b.enabled;
            if (b.maxUsagePct !== undefined) {
                const v = Number(b.maxUsagePct);
                if (!Number.isFinite(v) || v < 0 || v > 100) {
                    throw errors.badRequest('Bonus usage % must be between 0 and 100', 'BAD_USAGE_PCT');
                }
                (c.bonus as any).maxUsagePct = v;
            }
            if (b.minTopup !== undefined) {
                const v = Number(b.minTopup);
                if (!Number.isFinite(v) || v < 1) throw errors.badRequest('Invalid minimum topup', 'BAD_MIN_TOPUP');
                (c.bonus as any).minTopup = v;
            }
            if (b.maxTopup !== undefined) {
                const v = Number(b.maxTopup);
                if (!Number.isFinite(v) || v < 1) throw errors.badRequest('Invalid maximum topup', 'BAD_MAX_TOPUP');
                (c.bonus as any).maxTopup = v;
            }
            if ((c.bonus as any).maxTopup < (c.bonus as any).minTopup) {
                throw errors.badRequest('Maximum topup must be above the minimum', 'BAD_TOPUP_RANGE');
            }
            if (Array.isArray(b.tiers)) {
                const tiers = b.tiers.map((t: any) => {
                    const minAmount = Number(t.minAmount);
                    const value = Number(t.value);
                    const type = t.type === 'flat' ? 'flat' : 'percent';
                    const maxBonus = Number(t.maxBonus) || 0;
                    if (!Number.isFinite(minAmount) || minAmount < 1) {
                        throw errors.badRequest('Tier amount must be at least 1', 'BAD_TIER');
                    }
                    if (!Number.isFinite(value) || value < 0) throw errors.badRequest('Invalid tier value', 'BAD_TIER');
                    if (type === 'percent' && value > 100) {
                        throw errors.badRequest('Percent bonus cannot exceed 100', 'BAD_TIER');
                    }
                    return { minAmount, type, value, maxBonus: maxBonus < 0 ? 0 : maxBonus };
                });
                const seen = new Set<number>();
                for (const t of tiers) {
                    if (seen.has(t.minAmount)) throw errors.badRequest('Duplicate tier amount', 'DUPLICATE_TIER');
                    seen.add(t.minAmount);
                }
                (c.bonus as any).tiers = tiers.sort((x: any, y: any) => x.minAmount - y.minAmount);
            }
        }

        const r = patch?.referral;
        if (r) {
            if (typeof r.enabled === 'boolean') (c.referral as any).enabled = r.enabled;
            if (r.rewardWallet) {
                (c.referral as any).rewardWallet = r.rewardWallet === 'bonus' ? 'bonus' : 'money';
            }
            if (r.refereeRewardWallet) {
                (c.referral as any).refereeRewardWallet = r.refereeRewardWallet === 'money' ? 'money' : 'bonus';
            }
            if (r.refereeSignupReward !== undefined) {
                const v = Number(r.refereeSignupReward);
                if (!Number.isFinite(v) || v < 0) throw errors.badRequest('Invalid signup reward', 'BAD_REWARD');
                (c.referral as any).refereeSignupReward = v;
            }
            if (typeof r.terms === 'string') (c.referral as any).terms = r.terms.slice(0, 2000);
            if (Array.isArray(r.milestones)) {
                const ms = r.milestones.map((m: any) => {
                    const deliveries = Number(m.deliveries);
                    const reward = Number(m.reward);
                    if (!Number.isFinite(deliveries) || deliveries < 1) {
                        throw errors.badRequest('Milestone deliveries must be at least 1', 'BAD_MILESTONE');
                    }
                    if (!Number.isFinite(reward) || reward < 0) {
                        throw errors.badRequest('Invalid milestone reward', 'BAD_MILESTONE');
                    }
                    return { deliveries, reward };
                });
                const seen = new Set<number>();
                for (const m of ms) {
                    if (seen.has(m.deliveries)) throw errors.badRequest('Duplicate milestone', 'DUPLICATE_MILESTONE');
                    seen.add(m.deliveries);
                }
                (c.referral as any).milestones = ms.sort((x: any, y: any) => x.deliveries - y.deliveries);
            }
        }

        await c.save();
        return toPublic(c);
    },

    /**
     * Bonus earned for a topup of `amount` — highest matching tier wins.
     * Returns 0 when bonuses are disabled or no tier matches.
     */
    bonusForTopup(cfg: PublicRewardConfig, amount: number): number {
        return calcBonusForTopup(cfg.bonus, amount);
    },

    /** Completed trip count for a rider, resolved from their User id. */
    async riderCompletedTrips(userId: string): Promise<number> {
        const Rider = (await import('../models/Rider')).default;
        const rider = await Rider.findOne({ user: userId }).select('trips').lean();
        return Number((rider as any)?.trips || 0);
    },

    /** Ensure the user has a referral code, generating a unique one on demand. */
    async ensureCode(userId: string): Promise<string> {
        const user = await User.findById(userId);
        if (!user) throw errors.notFound('User not found', 'USER_NOT_FOUND');
        if (user.referralCode) return user.referralCode;
        for (let i = 0; i < 6; i++) {
            const code = genCode(user.name || 'QIK');
            const clash = await User.exists({ referralCode: code });
            if (clash) continue;
            user.referralCode = code;
            await user.save();
            return code;
        }
        throw errors.internal('Could not generate referral code', 'REFERRAL_CODE_FAILED');
    },

    /** Refer & Earn screen payload. */
    async getMyReferral(userId: string) {
        const cfg = await this.getConfig();
        const code = await this.ensureCode(userId);
        const [rows, me] = await Promise.all([
            Referral.find({ referrer: userId })
                .populate('referee', 'name phone createdAt')
                .sort({ createdAt: -1 })
                .limit(100)
                .lean(),
            User.findById(userId).select('referredBy').lean(),
        ]);
        const invites = rows.map((r: any) => ({
            id: String(r._id),
            name: r.referee?.name || 'Qikzo user',
            phone: r.referee?.phone ? `••••${String(r.referee.phone).slice(-4)}` : '',
            deliveries: r.deliveries || 0,
            earned: r.totalEarned || 0,
            joinedAt: r.createdAt,
            nextMilestone:
                cfg.referral.milestones.find((m) => !(r.awarded || []).includes(m.deliveries)) || null,
        }));
        return {
            code,
            enabled: cfg.referral.enabled,
            milestones: cfg.referral.milestones,
            rewardWallet: cfg.referral.rewardWallet,
            refereeSignupReward: cfg.referral.refereeSignupReward,
            refereeRewardWallet: cfg.referral.refereeRewardWallet,
            terms: cfg.referral.terms,
            totalInvites: invites.length,
            totalEarned: invites.reduce((s, i) => s + i.earned, 0),
            canApplyCode: !me?.referredBy,
            invites,
        };
    },

    /**
     * Apply someone else's referral code. Only allowed once, only before the
     * user has completed any delivery, and never self-referral.
     */
    async applyCode(userId: string, rawCode: string) {
        const cfg = await this.getConfig();
        if (!cfg.referral.enabled) throw errors.badRequest('Referrals are currently disabled', 'REFERRAL_DISABLED');
        const code = String(rawCode || '').trim().toUpperCase();
        if (!code) throw errors.badRequest('Referral code required', 'CODE_REQUIRED');

        const me = await User.findById(userId);
        if (!me) throw errors.notFound('User not found', 'USER_NOT_FOUND');
        if (me.referredBy) throw errors.badRequest('You have already used a referral code', 'ALREADY_REFERRED');
        if (me.referralCode && me.referralCode === code) {
            throw errors.badRequest('You cannot use your own code', 'SELF_REFERRAL');
        }

        const referrer = await User.findOne({ referralCode: code }).select('_id name');
        if (!referrer) throw errors.badRequest('Invalid referral code', 'INVALID_CODE');
        if (String(referrer._id) === String(userId)) {
            throw errors.badRequest('You cannot use your own code', 'SELF_REFERRAL');
        }

        // A code can only be applied before the account has earned anything.
        // Customers are measured by their delivered bookings, riders by the
        // trips they have completed.
        const delivered =
            me.role === 'rider'
                ? await this.riderCompletedTrips(userId)
                : await Booking.countDocuments({ user: userId, status: 'Delivered' });
        if (delivered > 0) {
            throw errors.badRequest('Referral codes only work before your first delivery', 'TOO_LATE');
        }

        me.referredBy = referrer._id as any;
        await me.save();
        await Referral.create({ referrer: referrer._id, referee: me._id, code });

        // Welcome credit for the new user (optional, admin-configurable).
        let credited = 0;
        if (cfg.referral.refereeSignupReward > 0) {
            const { walletService } = await import('./walletService');
            await walletService.creditReward({
                userId,
                wallet: cfg.referral.refereeRewardWallet,
                amount: cfg.referral.refereeSignupReward,
                note: `Referral welcome bonus (${code})`,
                refCode: `referral-signup:${userId}`,
            });
            credited = cfg.referral.refereeSignupReward;
        }
        return { applied: true, referrer: referrer.name || 'A Qikzo user', credited, code };
    },

    /**
     * Called once per completed delivery. Increments the referee's counter and
     * pays the referrer for every milestone newly crossed. Idempotent per
     * milestone via the ledger `refCode`.
     */
    async onDeliveryCompleted(userId: string) {
        const ref = await Referral.findOne({ referee: userId });
        if (!ref) return null;
        const cfg = await this.getConfig();
        if (!cfg.referral.enabled) return null;

        ref.deliveries = (ref.deliveries || 0) + 1;
        const awarded: number[] = (ref.awarded as any) || [];
        const { walletService } = await import('./walletService');
        const paid: { deliveries: number; reward: number }[] = [];

        for (const m of milestonesDue(cfg.referral.milestones, ref.deliveries, awarded)) {
            if (m.reward > 0) {
                await walletService.creditReward({
                    userId: String(ref.referrer),
                    wallet: cfg.referral.rewardWallet,
                    amount: m.reward,
                    note: `Referral reward — friend completed ${m.deliveries} deliveries`,
                    refCode: `referral:${ref._id}:${m.deliveries}`,
                });
                ref.totalEarned = (ref.totalEarned || 0) + m.reward;
            }
            awarded.push(m.deliveries);
            paid.push(m);
        }
        ref.awarded = awarded as any;
        await ref.save();

        if (paid.length) {
            const notificationService = (await import('./notificationService')).default;
            const referrerUser = await User.findById(ref.referrer).select('role').lean();
            const audience = (referrerUser as any)?.role === 'rider' ? 'rider' : 'customer';
            for (const m of paid) {
                void notificationService
                    .emit({
                        user: String(ref.referrer),
                        audience: audience as any,
                        topic: 'wallet',
                        title: 'Referral reward credited',
                        body: `You earned ₹${m.reward} — your friend completed ${m.deliveries} deliveries.`,
                        data: { event: 'referral:reward', amount: String(m.reward) },
                    })
                    .catch(() => {});
            }
        }
        return { deliveries: ref.deliveries, paid };
    },

    /**
     * Admin listing of referral relationships, enriched with milestone
     * progress so the dashboard can show completed vs pending rewards
     * without recomputing the reward config per row.
     */
    async listReferrals(opts: { page?: number; limit?: number; q?: string } = {}) {
        const page = Math.max(1, Number(opts.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(opts.limit) || 20));
        const cfg = await this.getConfig();

        const q = String(opts.q || '').trim();
        let filter: any = {};
        if (q) {
            const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            const matched = await User.find({ $or: [{ name: rx }, { phone: rx }, { referralCode: rx }] })
                .select('_id')
                .limit(500)
                .lean();
            const ids = matched.map((u: any) => u._id);
            filter = { $or: [{ code: rx }, { referrer: { $in: ids } }, { referee: { $in: ids } }] };
        }

        const [rows, total] = await Promise.all([
            Referral.find(filter)
                .populate('referrer', 'name phone referralCode role')
                .populate('referee', 'name phone role')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Referral.countDocuments(filter),
        ]);

        const milestones = cfg.referral.milestones;
        const items = rows.map((r: any) => {
            const awarded: number[] = r.awarded || [];
            const deliveries = r.deliveries || 0;
            const next = milestones.find((m) => !awarded.includes(m.deliveries)) || null;
            const pending = pendingReward(milestones, awarded);
            return {
                id: String(r._id),
                code: r.code,
                referrerName: r.referrer?.name || '—',
                referrerPhone: r.referrer?.phone || '',
                referrerRole: r.referrer?.role || 'customer',
                refereeName: r.referee?.name || '—',
                refereePhone: r.referee?.phone || '',
                refereeRole: r.referee?.role || 'customer',
                deliveries,
                awarded,
                milestonesTotal: milestones.length,
                milestonesDone: awarded.length,
                nextMilestone: next,
                target: next ? next.deliveries : milestones.length ? milestones[milestones.length - 1].deliveries : 0,
                pendingReward: pending,
                totalEarned: r.totalEarned || 0,
                createdAt: r.createdAt,
            };
        });

        return {
            items,
            total,
            page,
            limit,
            hasMore: page * limit < total,
            milestones,
            rewardWallet: cfg.referral.rewardWallet,
            enabled: cfg.referral.enabled,
        };
    },
};

export default rewardService;
