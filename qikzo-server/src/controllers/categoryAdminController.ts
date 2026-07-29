import asyncHandler from '../middleware/asyncHandler';
import categoryAdminService from '../services/categoryAdminService';
import { ok } from '../lib/http';

/**
 * Admin controller for Category / State / Area management. All handlers
 * assume `requireAuth + requireAdmin` have already run.
 */
export const categoryAdminController = {
    list: asyncHandler(async (req, res) => ok(res, await categoryAdminService.list({
        active: req.query.active === undefined ? undefined : req.query.active === 'true',
        q: req.query.q as any,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        cursor: req.query.cursor as any,
    }))),
    get: asyncHandler(async (req, res) => ok(res, { category: await categoryAdminService.get(req.params.id) })),
    create: asyncHandler(async (req, res) => ok(res, { category: await categoryAdminService.create(req.user!.id, req.body) }, 'Category created')),
    update: asyncHandler(async (req, res) => ok(res, { category: await categoryAdminService.update(req.user!.id, req.params.id, req.body) }, 'Category updated')),
    remove: asyncHandler(async (req, res) => ok(res, await categoryAdminService.remove(req.user!.id, req.params.id), 'Category deleted')),
    toggle: asyncHandler(async (req, res) => ok(res, { category: await categoryAdminService.toggle(req.user!.id, req.params.id) }, 'Category toggled')),

    addState: asyncHandler(async (req, res) => ok(res, { category: await categoryAdminService.addState(req.user!.id, req.params.id, req.body) }, 'State added')),
    updateState: asyncHandler(async (req, res) => ok(res, { category: await categoryAdminService.updateState(req.user!.id, req.params.id, req.params.stateId, req.body) }, 'State updated')),
    removeState: asyncHandler(async (req, res) => ok(res, { category: await categoryAdminService.removeState(req.user!.id, req.params.id, req.params.stateId) }, 'State removed')),

    addArea: asyncHandler(async (req, res) => ok(res, { category: await categoryAdminService.addArea(req.user!.id, req.params.id, req.params.stateId, req.body) }, 'Area added')),
    updateArea: asyncHandler(async (req, res) => ok(res, { category: await categoryAdminService.updateArea(req.user!.id, req.params.id, req.params.stateId, req.params.areaId, req.body) }, 'Area updated')),
    removeArea: asyncHandler(async (req, res) => ok(res, { category: await categoryAdminService.removeArea(req.user!.id, req.params.id, req.params.stateId, req.params.areaId) }, 'Area removed')),
};

export default categoryAdminController;
