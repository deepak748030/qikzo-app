import { Router } from 'express';
import asyncHandler from '../middleware/asyncHandler';
import User from '../models/User';
import { ok } from '../lib/http';
import { errors } from '../lib/errors';
import { authLimiter } from '../middleware/rateLimiters';

/**
 * Public bootstrap for first admin only. Idempotent status check.
 * Once ANY admin exists, POST /bootstrap becomes a no-op with 403.
 * OTP login is still used to actually sign in — this only mints the User row
 * with role=admin so the phone can pass the requireAdmin gate afterwards.
 */
const router = Router();

router.get('/status', asyncHandler(async (_req, res) => {
    const adminExists = !!(await User.exists({ role: 'admin' }));
    return ok(res, { adminExists });
}));

router.post('/', authLimiter, asyncHandler(async (req, res) => {
    const adminExists = await User.exists({ role: 'admin' });
    if (adminExists) throw errors.forbidden('Admin already exists', 'ADMIN_EXISTS');

    const rawPhone = String(req.body?.phone || '').trim();
    const name = String(req.body?.name || 'Admin').trim() || 'Admin';
    const phone = rawPhone.startsWith('+') ? rawPhone : `+91${rawPhone.replace(/\D/g, '')}`;
    if (!/^\+\d{10,15}$/.test(phone)) throw errors.badRequest('Invalid phone', 'BAD_PHONE');

    const existing = await User.findOne({ phone });
    const user = existing
        ? await User.findByIdAndUpdate(existing._id, { role: 'admin', name }, { new: true })
        : await User.create({ phone, name, role: 'admin', onboarded: true });

    return ok(res, { user: { id: String(user!._id), phone: user!.phone, name: user!.name, role: user!.role } }, 'Admin created');
}));

export default router;
