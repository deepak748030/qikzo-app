import type { Response } from 'express';

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
