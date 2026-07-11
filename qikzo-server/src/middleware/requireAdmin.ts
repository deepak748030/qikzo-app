import type { Request, Response, NextFunction } from 'express';
import { errors } from '../lib/errors';

/**
 * Admin gate. Chains after `requireAuth`; rejects anyone whose User.role is
 * not `admin`. The role is re-read from Mongo in requireAuth, so a JWT alone
 * cannot claim admin.
 */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
    if (!req.user) return next(errors.unauthorized('Not authenticated', 'NO_TOKEN'));
    if ((req.user as any).role !== 'admin') {
        return next(errors.forbidden('Admin only', 'NOT_ADMIN'));
    }
    next();
}

export default requireAdmin;
