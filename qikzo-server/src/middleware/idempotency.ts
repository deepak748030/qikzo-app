import type { Request, Response, NextFunction } from 'express';

/**
 * Idempotency middleware — protects against double-tap POSTs (customer taps
 * "Book Now" twice, network retries a slow response, etc.) by remembering
 * the first response for a given `Idempotency-Key` and replaying it on the
 * repeat request.
 *
 * Scope: in-memory LRU keyed by `userId + key`. 5-minute TTL. Safe on a
 * SINGLE Node process — if you ever run PM2 cluster or multiple pods, move
 * this to Redis (the interface stays the same).
 *
 * Contract:
 *   - Client sends header `Idempotency-Key: <uuid-ish string>` on POSTs
 *     it wants to be idempotent. Missing header → middleware is a no-op.
 *   - We buffer the response with a small res.json() wrapper and cache
 *     the status + body on first success/error.
 *   - A retry with the same key within TTL returns the cached response.
 */

type CachedResponse = { status: number; body: any; at: number };

const TTL_MS = 5 * 60 * 1000;
const MAX_ENTRIES = 5000;
const store = new Map<string, CachedResponse>();

function evictIfLarge() {
    if (store.size < MAX_ENTRIES) return;
    const cutoff = Date.now() - TTL_MS;
    for (const [k, v] of store) {
        if (v.at < cutoff) store.delete(k);
        if (store.size < MAX_ENTRIES) break;
    }
    // Still over? Drop the oldest inserted entries (Map preserves insertion order).
    if (store.size >= MAX_ENTRIES) {
        const toDrop = store.size - Math.floor(MAX_ENTRIES * 0.9);
        let i = 0;
        for (const k of store.keys()) {
            if (i++ >= toDrop) break;
            store.delete(k);
        }
    }
}

export function idempotency() {
    return function idempotencyMiddleware(req: Request, res: Response, next: NextFunction) {
        const key = req.header('idempotency-key') || req.header('Idempotency-Key');
        if (!key || typeof key !== 'string' || key.length < 8 || key.length > 128) return next();
        const uid = (req as any).user?.id || (req as any).user?._id || 'anon';
        const cacheKey = `${uid}|${req.method}|${req.path}|${key}`;

        const hit = store.get(cacheKey);
        if (hit && Date.now() - hit.at < TTL_MS) {
            res.setHeader('idempotent-replay', 'true');
            return res.status(hit.status).json(hit.body);
        }

        const origJson = res.json.bind(res);
        (res as any).json = (body: any) => {
            try {
                if (res.statusCode < 500) {
                    store.set(cacheKey, { status: res.statusCode, body, at: Date.now() });
                    evictIfLarge();
                }
            } catch { /* never break the response */ }
            return origJson(body);
        };
        next();
    };
}

export default idempotency;
