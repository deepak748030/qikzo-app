/**
 * Reward math regression tests — run with:  npm run test:rewards
 * Uses node:test, so no extra dependency and no database is required.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { bonusForTopup, bonusUsable, splitBill, milestonesDue, pendingReward } from '../services/rewardMath';

const tiers = [
    { minAmount: 100, value: 5 },
    { minAmount: 500, value: 40 },
    { minAmount: 1000, value: 150 },
];
const bonus = { enabled: true, tiers };

test('top-up bonus picks the highest matching slab', () => {
    assert.equal(bonusForTopup(bonus, 50), 0);
    assert.equal(bonusForTopup(bonus, 100), 5);
    assert.equal(bonusForTopup(bonus, 499), 5);
    assert.equal(bonusForTopup(bonus, 500), 40);
});

test('slabs pay a fixed amount', () => {
    assert.equal(bonusForTopup(bonus, 900), 40);
    assert.equal(bonusForTopup(bonus, 1000), 150);
});

test('disabling the programme stops all bonuses', () => {
    assert.equal(bonusForTopup({ enabled: false, tiers }, 1000), 0);
});

test('bonus usage is capped at the admin percentage of the bill', () => {
    assert.equal(bonusUsable(1000, 500, 10), 100);
    assert.equal(bonusUsable(1000, 40, 10), 40, 'limited by balance');
    assert.equal(bonusUsable(1000, 500, 0), 0, 'cap of 0 disables spending');
    assert.equal(bonusUsable(95, 500, 10), 9, 'rounds down, never up');
});

test('checkout splits money and bonus so the total always matches the bill', () => {
    const s = splitBill(1000, 500, 10);
    assert.deepEqual(s, { bonus: 100, money: 900 });
    assert.equal(s.bonus + s.money, 1000);

    const poor = splitBill(1000, 15, 10);
    assert.deepEqual(poor, { bonus: 15, money: 985 });

    const noBonus = splitBill(250, 0, 10);
    assert.deepEqual(noBonus, { bonus: 0, money: 250 });
});

test('milestones pay once and only once', () => {
    const ms = [
        { deliveries: 1, reward: 20 },
        { deliveries: 5, reward: 100 },
        { deliveries: 10, reward: 250 },
    ];
    assert.deepEqual(milestonesDue(ms, 1, []), [{ deliveries: 1, reward: 20 }]);
    assert.deepEqual(milestonesDue(ms, 6, [1]), [{ deliveries: 5, reward: 100 }]);
    assert.deepEqual(milestonesDue(ms, 6, [1, 5]), [], 'already awarded');
    assert.equal(milestonesDue(ms, 12, []).length, 3, 'back-pays skipped milestones');
    assert.equal(pendingReward(ms, [1]), 350);
    assert.equal(pendingReward(ms, [1, 5, 10]), 0);
});
