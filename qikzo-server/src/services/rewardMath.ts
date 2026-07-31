/**
 * Pure reward math — no database, no mongoose. Extracted so the bonus and
 * referral rules can be unit-tested in isolation and reused by both the
 * reward service and the wallet service.
 */

export type BonusTier = { minAmount: number; value: number };
export type Milestone = { deliveries: number; reward: number };

/** Bonus earned for a topup of `amount` — highest matching tier wins. */
export function bonusForTopup(
    bonus: { enabled: boolean; tiers: BonusTier[] },
    amount: number,
): number {
    if (!bonus.enabled) return 0;
    const matching = bonus.tiers.filter((t) => amount >= t.minAmount);
    if (!matching.length) return 0;
    const tier = matching[matching.length - 1];
    return Math.floor(Math.max(0, tier.value));
}

/** Max bonus spendable on a bill of `amount`, given balance + admin cap. */
export function bonusUsable(amount: number, bonusBalance: number, maxUsagePct: number): number {
    const cap = Math.floor((Math.max(0, amount) * Math.max(0, Math.min(100, maxUsagePct))) / 100);
    return Math.max(0, Math.min(cap, Math.floor(Math.max(0, bonusBalance))));
}

/**
 * Split a bill across the bonus and money wallets. Bonus is applied first but
 * never beyond the admin cap, so the remainder always falls to money.
 */
export function splitBill(
    amount: number,
    bonusBalance: number,
    maxUsagePct: number,
): { bonus: number; money: number } {
    const bonus = bonusUsable(amount, bonusBalance, maxUsagePct);
    return { bonus, money: Math.max(0, Math.round((amount - bonus) * 100) / 100) };
}

/** Milestones newly crossed at `deliveries` that have not been paid yet. */
export function milestonesDue(milestones: Milestone[], deliveries: number, awarded: number[]): Milestone[] {
    return milestones.filter((m) => deliveries >= m.deliveries && !awarded.includes(m.deliveries));
}

/** Total reward still outstanding for a referral. */
export function pendingReward(milestones: Milestone[], awarded: number[]): number {
    return milestones.filter((m) => !awarded.includes(m.deliveries)).reduce((s, m) => s + m.reward, 0);
}
