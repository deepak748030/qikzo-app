import asyncHandler from '../middleware/asyncHandler';
import categoryBannerService from '../services/categoryBannerService';
import type { BannerType } from '../services/categoryBannerService';
import { ok, created, cacheable } from '../lib/http';
import { errors } from '../lib/errors';

function readType(raw: unknown): BannerType {
    const t = String(raw || '').trim().toLowerCase();
    if (t === 'food' || t === 'grocery') return t;
    throw errors.badRequest('type must be "food" or "grocery"', 'TYPE_INVALID');
}

export const categoryBannerController = {
    // ---------- Admin ----------

    listAdmin: asyncHandler(async (req, res) =>
        ok(
            res,
            await categoryBannerService.listAdmin({
                type: req.query.type ? readType(req.query.type) : undefined,
                active: req.query.active === undefined ? undefined : req.query.active === 'true',
                limit: req.query.limit ? Number(req.query.limit) : undefined,
                cursor: req.query.cursor as string | undefined,
            })
        )
    ),

    get: asyncHandler(async (req, res) => ok(res, { banner: await categoryBannerService.get(req.params.id) })),

    create: asyncHandler(async (req, res) =>
        created(res, { banner: await categoryBannerService.create(req.body) }, 'Banner created')
    ),

    update: asyncHandler(async (req, res) =>
        ok(res, { banner: await categoryBannerService.update(req.params.id, req.body) }, 'Banner updated')
    ),

    toggle: asyncHandler(async (req, res) =>
        ok(res, { banner: await categoryBannerService.toggle(req.params.id) }, 'Banner updated')
    ),

    remove: asyncHandler(async (req, res) => {
        await categoryBannerService.remove(req.params.id);
        return ok(res, {}, 'Banner deleted');
    }),

    // ---------- Public (customer app) ----------

    /** Vertical list for the Food / Grocery screen. */
    listForTab: asyncHandler(async (req, res) => {
        const type = readType(req.query.type);
        const lat = req.query.lat != null ? Number(req.query.lat) : undefined;
        const lng = req.query.lng != null ? Number(req.query.lng) : undefined;
        // Personalised (lat/lng present) responses skip the shared cache so
        // each customer gets their own proximity ordering — same rule the
        // existing /banners endpoint uses.
        if (!Number.isFinite(lat as number) || !Number.isFinite(lng as number)) cacheable(res, 60, 300);
        return ok(res, await categoryBannerService.listForTab({ type, lat, lng }));
    }),

    /** Details tab: banner + applicable merchants. */
    detail: asyncHandler(async (req, res) => {
        cacheable(res, 30, 120);
        return ok(res, await categoryBannerService.detail(req.params.id));
    }),

    /** Rating tab. */
    reviews: asyncHandler(async (req, res) => {
        cacheable(res, 30, 120);
        return ok(
            res,
            await categoryBannerService.reviews(
                req.params.id,
                req.query.limit ? Number(req.query.limit) : undefined
            )
        );
    }),
};

export default categoryBannerController;
