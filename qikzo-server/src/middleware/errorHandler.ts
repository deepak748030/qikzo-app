import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors';
import { logger } from '../lib/logger';
import { captureError } from '../lib/sentry';
import env from '../config/env';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction): void {
    const status = err?.status || err?.statusCode || 500;
    const code = err instanceof AppError ? err.code : err?.code || (status >= 500 ? 'INTERNAL' : 'ERROR');
    const message = err?.message || 'Internal server error';

    if (status >= 500) {
        logger.error({ err, requestId: req.id, path: req.originalUrl }, 'unhandled_error');
        captureError(err, { requestId: req.id, path: req.originalUrl, method: req.method, userId: (req as any).user?.id });
    } else {
        logger.warn({ code, msg: message, requestId: req.id, path: req.originalUrl }, 'handled_error');
    }

    res.status(status).json({
        success: false,
        message,
        code,
        details: err?.details,
        requestId: req.id,
        ...(env.isProd ? {} : { stack: err?.stack }),
    });
}

export default errorHandler;
