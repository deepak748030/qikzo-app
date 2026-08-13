import asyncHandler from '../middleware/asyncHandler';
import coverageService from '../services/coverageService';
import { ok, created } from '../lib/http';

export const coverageController = {
    list: asyncHandler(async (_req, res) => ok(res, await coverageService.list())),
    createCity: asyncHandler(async (req, res) =>
        created(res, { city: await coverageService.createCity(req.body) }, 'City created')),
    updateCity: asyncHandler(async (req, res) =>
        ok(res, { city: await coverageService.updateCity(req.params.id, req.body) }, 'City updated')),
    removeCity: asyncHandler(async (req, res) => {
        await coverageService.removeCity(req.params.id);
        return ok(res, {}, 'City deleted');
    }),
    addArea: asyncHandler(async (req, res) =>
        ok(res, { city: await coverageService.addArea(req.params.id, req.body) }, 'Area added')),
    updateArea: asyncHandler(async (req, res) =>
        ok(res, { city: await coverageService.updateArea(req.params.id, req.params.areaId, req.body) }, 'Area updated')),
    removeArea: asyncHandler(async (req, res) =>
        ok(res, { city: await coverageService.removeArea(req.params.id, req.params.areaId) }, 'Area removed')),
};

export default coverageController;
