import type { Request, Response, NextFunction } from 'express';
import Rider, { type RiderDoc } from '../models/Rider';
import { errors } from '../lib/errors';

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            rider?: RiderDoc & { id: string };
        }
    }
}

/**
 * Resolve the Rider record for the authenticated user, auto-provisioning one
 * on first hit so the mobile rider app can start posting online/location
 * updates immediately after OTP signup — we don't yet have a separate rider
 * onboarding endpoint.
 *
 * Must be mounted AFTER requireAuth.
 */
export async function requireRider(req: Request, _res: Response, next: NextFunction): Promise<void> {
    try {
        if (!req.user) throw errors.unauthorized('Not authenticated', 'NO_USER');
        let rider = await Rider.findOne({ user: req.user.id });
        if (!rider) {
            rider = await Rider.create({
                user: req.user.id,
                name: req.user.name || 'Rider',
                phone: req.user.phone || '',
                vehicle: 'Two-wheeler',
                vehicleNo: 'PENDING',
                online: false,
                available: true,
            });
        }
        req.rider = Object.assign(rider, { id: String(rider._id) }) as any;
        next();
    } catch (e) {
        next(e);
    }
}

export default requireRider;
