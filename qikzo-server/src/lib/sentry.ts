import * as Sentry from '@sentry/node';

/**
 * Sentry — remote error tracking. No-op unless `SENTRY_DSN` is set, so local
 * dev stays quiet. `tracesSampleRate` is intentionally low; raise per env.
 */
let initialised = false;

export function initSentry(): boolean {
    if (initialised) return true;
    const dsn = process.env.SENTRY_DSN;
    if (!dsn) return false;
    Sentry.init({
        dsn,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.05'),
        release: process.env.SENTRY_RELEASE || undefined,
    });
    initialised = true;
    return true;
}

export function captureError(err: unknown, ctx?: Record<string, any>): void {
    if (!initialised) return;
    try { Sentry.captureException(err, ctx ? { extra: ctx } : undefined); } catch {}
}

export { Sentry };
