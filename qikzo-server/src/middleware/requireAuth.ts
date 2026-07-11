import type { Request, Response, NextFunction } from 'express';
import { verifyAccess } from '../lib/tokens';
import { errors } from '../lib/errors';
import User, { type UserDoc } from '../models/User';

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            user?: UserDoc & { id: string };
        }
    }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
    try {
        const h = req.headers.authorization || '';
        const token = h.startsWith('Bearer ') ? h.slice(7) : null;
        if (!token) throw errors.unauthorized('Not authenticated', 'NO_TOKEN');
        const payload = verifyAccess(token);
        const user = await User.findById(payload.id).lean<UserDoc>();
        if (!user) throw errors.unauthorized('User not found', 'USER_NOT_FOUND');
        req.user = { ...(user as any), id: String((user as any)._id) };
        next();
    } catch (e: any) {
        if (e?.name === 'AppError' || e?.status) return next(e);
        next(errors.unauthorized('Invalid or expired token', 'BAD_TOKEN'));
    }
}

export default requireAuth;
