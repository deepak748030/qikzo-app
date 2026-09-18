/**
 * Food/Grocery banner regression tests — run with:
 *     npm run test:banners
 * Uses node:test, so no extra dependency and no database is required: the
 * tests drive the pure core of the banner rules (coordinate validation,
 * proximity ranking, type → category mapping) directly.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { normaliseCoord, sortByProximity, CATEGORY_FOR_TYPE } from '../services/categoryBannerService';

const codeOf = (fn: () => unknown) => {
    try {
        fn();
    } catch (e: any) {
        return e?.code;
    }
    return null;
};

// ---------- coordinate validation ----------

test('a valid coordinate is accepted and coerced to numbers', () => {
    assert.deepEqual(normaliseCoord({ lat: 28.6315, lng: 77.2167 }), { lat: 28.6315, lng: 77.2167 });
    // Form values arrive as strings — they must still work.
    assert.deepEqual(normaliseCoord({ lat: '28.6315', lng: '77.2167' }), { lat: 28.6315, lng: 77.2167 });
});

test('boundary coordinates are allowed', () => {
    assert.deepEqual(normaliseCoord({ lat: 90, lng: 180 }), { lat: 90, lng: 180 });
    assert.deepEqual(normaliseCoord({ lat: -90, lng: -180 }), { lat: -90, lng: -180 });
});

test('a missing coordinate is rejected — the pickup point is mandatory', () => {
    assert.equal(codeOf(() => normaliseCoord(undefined)), 'COORD_REQUIRED');
    assert.equal(codeOf(() => normaliseCoord({})), 'COORD_REQUIRED');
    assert.equal(codeOf(() => normaliseCoord({ lat: 28.6 })), 'COORD_REQUIRED');
    assert.equal(codeOf(() => normaliseCoord({ lat: 'abc', lng: 77.2 })), 'COORD_REQUIRED');
});

test('out-of-range coordinates are rejected', () => {
    assert.equal(codeOf(() => normaliseCoord({ lat: 91, lng: 77.2 })), 'LAT_OUT_OF_RANGE');
    assert.equal(codeOf(() => normaliseCoord({ lat: -91, lng: 77.2 })), 'LAT_OUT_OF_RANGE');
    assert.equal(codeOf(() => normaliseCoord({ lat: 28.6, lng: 181 })), 'LNG_OUT_OF_RANGE');
    assert.equal(codeOf(() => normaliseCoord({ lat: 28.6, lng: -181 })), 'LNG_OUT_OF_RANGE');
});

// ---------- proximity ranking ----------

const DELHI = { lat: 28.6315, lng: 77.2167 };
const MUMBAI = { lat: 18.9438, lng: 72.8231 };
const NOIDA = { lat: 28.5675, lng: 77.321 };

test('banners are ranked nearest-first against the customer', () => {
    const ranked = sortByProximity(
        [
            { coord: MUMBAI, order: 1 },
            { coord: DELHI, order: 2 },
            { coord: NOIDA, order: 3 },
        ],
        DELHI
    );
    assert.deepEqual(
        ranked.map((b) => b.coord),
        [DELHI, NOIDA, MUMBAI],
        'Delhi first (0 km), Noida next, Mumbai last'
    );
});

test('`order` breaks ties when no customer location is known', () => {
    const ranked = sortByProximity(
        [
            { coord: DELHI, order: 3 },
            { coord: MUMBAI, order: 1 },
            { coord: NOIDA, order: 2 },
        ],
        null
    );
    assert.deepEqual(ranked.map((b) => b.order), [1, 2, 3]);
});

test('a NaN customer location falls back to `order` instead of corrupting the list', () => {
    const ranked = sortByProximity(
        [
            { coord: DELHI, order: 2 },
            { coord: MUMBAI, order: 1 },
        ],
        { lat: NaN, lng: NaN }
    );
    assert.deepEqual(ranked.map((b) => b.order), [1, 2]);
});

test('banners without a coordinate sink to the bottom', () => {
    const ranked = sortByProximity(
        [
            { coord: null, order: 1 },
            { coord: MUMBAI, order: 2 },
        ],
        DELHI
    );
    assert.deepEqual(ranked.map((b) => b.order), [2, 1], 'the coord-less banner must not outrank a real one');
});

test('the input array is not mutated', () => {
    const input = [
        { coord: MUMBAI, order: 1 },
        { coord: DELHI, order: 2 },
    ];
    const copy = [...input];
    sortByProximity(input, DELHI);
    assert.deepEqual(input, copy);
});

// ---------- type → category mapping ----------

test('banner type maps onto the existing OrderReview category slugs', () => {
    assert.equal(CATEGORY_FOR_TYPE.food, 'food');
    // The customer app's Grocery tab has always used the `groceries` slug.
    assert.equal(CATEGORY_FOR_TYPE.grocery, 'groceries');
    assert.equal(Object.keys(CATEGORY_FOR_TYPE).length, 2, 'only Food and Grocery exist');
});
