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

// Small in-process LRU-ish cache of the authenticated user document. Every
// authenticated request previously did a `User.findById` — with dozens of
// requests per screen this became the single largest source of DB traffic.
// Cache is keyed by user id, TTL 60 s. Cache is bounded to 500 entries.
type CacheEntry = { user: UserDoc; at: number };
const USER_TTL_MS = 60_000;
const USER_CACHE_MAX = 500;
const userCache = new Map<string, CacheEntry>();

function cacheGet(id: string): UserDoc | null {
    const hit = userCache.get(id);
    if (!hit) return null;
    if (Date.now() - hit.at > USER_TTL_MS) { userCache.delete(id); return null; }
    // touch — move to end so oldest evicts first
    userCache.delete(id); userCache.set(id, hit);
    return hit.user;
}
function cacheSet(id: string, user: UserDoc) {
    if (userCache.size >= USER_CACHE_MAX) {
        const firstKey = userCache.keys().next().value;
        if (firstKey) userCache.delete(firstKey);
    }
    userCache.set(id, { user, at: Date.now() });
}
/** Call from any write that mutates a user (block, role change, profile edit). */
export function invalidateAuthUser(id: string) { userCache.delete(String(id)); }

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
    try {
        const h = req.headers.authorization || '';
        const token = h.startsWith('Bearer ') ? h.slice(7) : null;
        if (!token) throw errors.unauthorized('Not authenticated', 'NO_TOKEN');
        const payload = verifyAccess(token);
        let user = cacheGet(payload.id);
        if (!user) {
            user = await User.findById(payload.id).lean<UserDoc>();
            if (!user) throw errors.unauthorized('User not found', 'USER_NOT_FOUND');
            cacheSet(payload.id, user);
        }
        if ((user as any).blocked) throw errors.forbidden('Account suspended', 'USER_BLOCKED');
        req.user = { ...(user as any), id: String((user as any)._id) };
        next();
    } catch (e: any) {
        if (e?.name === 'AppError' || e?.status) return next(e);
        next(errors.unauthorized('Invalid or expired token', 'BAD_TOKEN'));
    }
}

export default requireAuth;
