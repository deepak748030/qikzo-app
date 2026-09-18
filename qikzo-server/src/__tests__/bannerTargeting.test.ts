/**
 * Food/Grocery banner targeting regression tests — run with:
 *     npm run test:banners
 * Uses node:test, so no extra dependency and no database is required: the
 * tests drive `planStoreSelection`, the pure core of the banner targeting
 * rules, with the merchant rows handed in directly.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { planStoreSelection, KIND_FOR_TYPE, CATEGORY_FOR_TYPE } from '../services/categoryBannerService';

const A = '665f1a0000000000000000a1';
const B = '665f1b0000000000000000b2';
const C = '665f1c0000000000000000c3';

const RESTAURANTS = [
    { _id: A, name: 'ABC Restaurant', kind: 'restaurant' },
    { _id: B, name: 'XYZ Restaurant', kind: 'restaurant' },
];
const STORES = [{ _id: C, name: 'City Fresh Mart', kind: 'store' }];

const codeOf = (fn: () => unknown) => {
    try {
        fn();
    } catch (e: any) {
        return e?.code;
    }
    return null;
};

test('no selection at all means the banner applies to ALL', () => {
    const fromUndefined = planStoreSelection('food', undefined, RESTAURANTS as any);
    assert.equal(fromUndefined.storeIdsEmpty, true);
    assert.deepEqual(fromUndefined.storeIds, []);
    assert.deepEqual(fromUndefined.storeNames, []);

    const fromEmpty = planStoreSelection('grocery', [], STORES as any);
    assert.equal(fromEmpty.storeIdsEmpty, true, 'explicit empty array is also ALL');
});

test('a selection switches the ALL flag off and snapshots the names', () => {
    const sel = planStoreSelection('food', [A, B], RESTAURANTS as any);
    assert.equal(sel.storeIdsEmpty, false);
    assert.deepEqual(sel.storeIds, [A, B]);
    assert.deepEqual(sel.storeNames, ['ABC Restaurant', 'XYZ Restaurant']);
});

test('selection order and duplicates are normalised', () => {
    const sel = planStoreSelection('food', [B, A, B], RESTAURANTS as any);
    assert.deepEqual(sel.storeIds, [B, A], 'duplicates collapse, first-seen order kept');
    assert.deepEqual(sel.storeNames, ['XYZ Restaurant', 'ABC Restaurant']);
});

test('malformed ids are ignored — and everything malformed falls back to ALL', () => {
    const partial = planStoreSelection('food', [A, 'not-an-id'], RESTAURANTS as any);
    assert.deepEqual(partial.storeIds, [A]);
    assert.equal(partial.storeIdsEmpty, false);

    const allBad = planStoreSelection('food', ['nope', ''], RESTAURANTS as any);
    assert.equal(allBad.storeIdsEmpty, true, 'no usable id left → ALL');
});

test('selecting a merchant that no longer exists is rejected', () => {
    const missing = '665f1d0000000000000000d4';
    assert.equal(
        codeOf(() => planStoreSelection('food', [A, missing], RESTAURANTS as any)),
        'STORE_NOT_FOUND'
    );
});

test('a Food banner cannot target a grocery store (and vice-versa)', () => {
    assert.equal(
        codeOf(() => planStoreSelection('food', [C], STORES as any)),
        'STORE_TYPE_MISMATCH'
    );
    assert.equal(
        codeOf(() => planStoreSelection('grocery', [A], RESTAURANTS as any)),
        'STORE_TYPE_MISMATCH'
    );
});

test('a Grocery banner accepts stores', () => {
    const sel = planStoreSelection('grocery', [C], STORES as any);
    assert.equal(sel.storeIdsEmpty, false);
    assert.deepEqual(sel.storeNames, ['City Fresh Mart']);
});

test('type → merchant kind / category mapping stays pinned', () => {
    assert.equal(KIND_FOR_TYPE.food, 'restaurant');
    assert.equal(KIND_FOR_TYPE.grocery, 'store');
    assert.equal(CATEGORY_FOR_TYPE.food, 'food');
    // The customer app's Grocery tab uses the existing `groceries` category slug.
    assert.equal(CATEGORY_FOR_TYPE.grocery, 'groceries');
});
