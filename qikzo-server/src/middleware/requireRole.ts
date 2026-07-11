import type { Request, Response, NextFunction } from 'express';
import { errors } from '../lib/errors';
import type { Role } from '../lib/tokens';

/** Gate a route to one or more roles. Requires requireAuth to have run first. */
export function requireRole(...allowed: Role[]) {
    return (req: Request, _res: Response, next: NextFunction) => {
        const role = (req.user as any)?.role as Role | undefined;
        if (!role) return next(errors.unauthorized());
        if (!allowed.includes(role)) return next(errors.forbidden('Insufficient role', 'ROLE_REQUIRED'));
        next();
    };
}

export default requireRole;
