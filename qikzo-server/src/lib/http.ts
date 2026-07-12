import type { Response } from 'express';

/**
 * Attach a short public HTTP micro-cache header. Safe to use on read-heavy
 * endpoints whose data changes infrequently (catalog categories, banners).
 * `stale-while-revalidate` lets clients / CDNs serve the stale copy instantly
 * while the next request refreshes in the background.
 */
export function cacheable(res: Response, maxAgeSec = 60, swrSec = 300) {
    res.setHeader(
        'Cache-Control',
        `public, max-age=${maxAgeSec}, stale-while-revalidate=${swrSec}`
    );
    return res;
}


/**
 * Response envelope. Kept backwards-compatible with the previous shape:
 *   { success: boolean, message: string, ...data }
 * Adds `requestId` and (for errors) `code` + optional `details`.
 * Do not remove the flat spread — existing mobile clients read fields at top-level.
 */
export function ok<T extends object>(res: Response, data: T = {} as T, message = 'OK') {
    return res.json({
        success: true,
        message,
        requestId: (res.req as any)?.id,
        ...data,
    });
}

export function created<T extends object>(res: Response, data: T = {} as T, message = 'Created') {
    return res.status(201).json({
        success: true,
        message,
        requestId: (res.req as any)?.id,
        ...data,
    });
}

export function fail(res: Response, status: number, message: string, code?: string, details?: unknown) {
    return res.status(status).json({
        success: false,
        message,
        code,
        details,
        requestId: (res.req as any)?.id,
    });
}
