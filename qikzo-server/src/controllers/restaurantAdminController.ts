import asyncHandler from '../middleware/asyncHandler';
import restaurantService from '../services/restaurantService';
import { ok, created } from '../lib/http';

/**
 * Admin CRUD for the merchant master (restaurants / grocery stores) that the
 * Food/Grocery banner flow points at. Mounted behind requireAuth + requireAdmin.
 */
export const restaurantAdminController = {
    list: asyncHandler(async (req, res) =>
        ok(
            res,
            await restaurantService.list({
                kind: req.query.kind as string | undefined,
                categorySlug: req.query.categorySlug as string | undefined,
                active: req.query.active === undefined ? undefined : req.query.active === 'true',
                q: req.query.q as string | undefined,
                limit: req.query.limit ? Number(req.query.limit) : undefined,
                cursor: req.query.cursor as string | undefined,
            })
        )
    ),

    /** Lightweight list for the banner form's multi-select. */
    options: asyncHandler(async (req, res) =>
        ok(
            res,
            await restaurantService.options({
                kind: req.query.kind as string | undefined,
                categorySlug: req.query.categorySlug as string | undefined,
            })
        )
    ),

    get: asyncHandler(async (req, res) => ok(res, { store: await restaurantService.get(req.params.id) })),

    create: asyncHandler(async (req, res) =>
        created(res, { store: await restaurantService.create(req.body) }, 'Store created')
    ),

    update: asyncHandler(async (req, res) =>
        ok(res, { store: await restaurantService.update(req.params.id, req.body) }, 'Store updated')
    ),

    toggle: asyncHandler(async (req, res) =>
        ok(res, { store: await restaurantService.toggle(req.params.id) }, 'Store updated')
    ),

    remove: asyncHandler(async (req, res) => {
        await restaurantService.remove(req.params.id);
        return ok(res, {}, 'Store deleted');
    }),
};

export default restaurantAdminController;
