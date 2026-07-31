import { Schema, model, type HydratedDocument, type InferSchemaType, type Model } from 'mongoose';

/**
 * RewardConfig — single admin-tunable document that drives:
 *
 *  1. Wallet **bonus** (formerly "loyalty"): when a user tops up their money
 *     wallet, the highest matching tier awards extra credit into the bonus
 *     wallet (e.g. add ₹100 → get ₹20 bonus → ₹120 total spending power).
 *  2. Bonus **usage cap**: how much of a single bill may be paid from the
 *     bonus wallet (default 10%). Never the whole bill at once.
 *  3. **Referral** milestones: when a referred user completes N deliveries,
 *     the referrer is credited a reward.
 *
 * Everything is server-authoritative — clients only render what this returns.
 */

const BonusTierSchema = new Schema(
    {
        // Tier applies when topup amount >= minAmount. Highest matching wins.
        minAmount: { type: Number, required: true, min: 1 },
        type: { type: String, enum: ['percent', 'flat'], default: 'percent' },
        value: { type: Number, required: true, min: 0 },
        // Optional ceiling for percent tiers (0 = no cap).
        maxBonus: { type: Number, default: 0, min: 0 },
    },
    { _id: false }
);

const MilestoneSchema = new Schema(
    {
        deliveries: { type: Number, required: true, min: 1 },
        reward: { type: Number, required: true, min: 0 },
    },
    { _id: false }
);

const RewardConfigSchema = new Schema(
    {
        key: { type: String, default: 'default', unique: true, index: true },

        bonus: {
            enabled: { type: Boolean, default: true },
            tiers: { type: [BonusTierSchema], default: () => DEFAULT_TIERS },
            // Max % of any single bill payable from the bonus wallet.
            maxUsagePct: { type: Number, default: 10, min: 0, max: 100 },
            minTopup: { type: Number, default: 10, min: 1 },
            maxTopup: { type: Number, default: 100000, min: 1 },
        },

        referral: {
            enabled: { type: Boolean, default: true },
            // Credited to the referrer when the referee hits each milestone.
            milestones: { type: [MilestoneSchema], default: () => DEFAULT_MILESTONES },
            // Which wallet the referral reward lands in.
            rewardWallet: { type: String, enum: ['money', 'bonus'], default: 'money' },
            // One-time credit to the new user when they apply a referral code.
            refereeSignupReward: { type: Number, default: 50, min: 0 },
            refereeRewardWallet: { type: String, enum: ['money', 'bonus'], default: 'bonus' },
            terms: {
                type: String,
                default:
                    'Rewards are credited once your friend completes the required number of deliveries. Bonus balance can be used up to the configured limit on each bill.',
            },
        },
    },
    { timestamps: true }
);

export const DEFAULT_TIERS = [
    { minAmount: 100, type: 'percent' as const, value: 20, maxBonus: 0 },
    { minAmount: 500, type: 'percent' as const, value: 25, maxBonus: 0 },
    { minAmount: 1000, type: 'percent' as const, value: 30, maxBonus: 0 },
];

export const DEFAULT_MILESTONES = [
    { deliveries: 100, reward: 500 },
    { deliveries: 500, reward: 1000 },
];

export type RewardConfigDoc = InferSchemaType<typeof RewardConfigSchema> & { _id: any };

interface RewardConfigStatics {
    getSingleton(): Promise<HydratedDocument<RewardConfigDoc>>;
}

RewardConfigSchema.statics.getSingleton = async function () {
    let c = await this.findOne({ key: 'default' });
    if (!c) c = await this.create({ key: 'default' });
    return c;
};

export const RewardConfig = model<RewardConfigDoc, Model<RewardConfigDoc> & RewardConfigStatics>(
    'RewardConfig',
    RewardConfigSchema
);
export default RewardConfig;
