import { http } from '../client';

export type ReferralMilestone = { deliveries: number; reward: number };

export type ReferralInvite = {
    id: string;
    name: string;
    phone: string;
    deliveries: number;
    earned: number;
    joinedAt: string;
    nextMilestone: ReferralMilestone | null;
};

export type ReferralInfo = {
    code: string;
    enabled: boolean;
    milestones: ReferralMilestone[];
    rewardWallet: 'money' | 'bonus';
    refereeSignupReward: number;
    refereeRewardWallet: 'money' | 'bonus';
    terms: string;
    totalInvites: number;
    totalEarned: number;
    canApplyCode: boolean;
    invites: ReferralInvite[];
};

export const referralApi = {
    me(): Promise<ReferralInfo> {
        return http.get<ReferralInfo>('/referrals/me');
    },
    apply(code: string) {
        return http.post<{ applied: boolean; referrer: string; credited: number; code: string }>(
            '/referrals/apply',
            { code }
        );
    },
};

export default referralApi;
