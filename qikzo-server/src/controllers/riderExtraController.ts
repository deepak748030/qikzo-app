import asyncHandler from '../middleware/asyncHandler';
import documentService from '../services/documentService';
import payoutService from '../services/payoutService';
import earningsService from '../services/earningsService';
import { ok, created } from '../lib/http';

export const riderExtraController = {
    // ----- Documents -----
    listDocuments: asyncHandler(async (req, res) => {
        const items = await documentService.listForRider(req.user!.id);
        return ok(res, { items });
    }),
    uploadDocument: asyncHandler(async (req, res) => {
        const doc = await documentService.upload(req.user!.id, req.body);
        return created(res, { document: doc });
    }),
    deleteDocument: asyncHandler(async (req, res) => {
        await documentService.remove(req.user!.id, req.params.id);
        return ok(res, {}, 'Deleted');
    }),

    // ----- KYC -----
    getKyc: asyncHandler(async (req, res) => {
        const kyc = await documentService.getKyc(req.user!.id);
        return ok(res, { kyc });
    }),
    submitKyc: asyncHandler(async (req, res) => {
        const kyc = await documentService.submitKyc(req.user!.id, req.body);
        return ok(res, { kyc });
    }),

    // ----- Payout method + requests -----
    getPayoutMethod: asyncHandler(async (req, res) => {
        const method = await payoutService.getMethod(req.user!.id);
        return ok(res, { method });
    }),
    setPayoutMethod: asyncHandler(async (req, res) => {
        const method = await payoutService.setMethod(req.user!.id, req.body);
        return ok(res, { method });
    }),
    listPayouts: asyncHandler(async (req, res) => {
        const items = await payoutService.list(req.user!.id);
        return ok(res, { items });
    }),
    requestPayout: asyncHandler(async (req, res) => {
        const payout = await payoutService.request(req.user!.id, Number(req.body.amount));
        return created(res, { payout });
    }),

    // ----- Earnings -----
    earnings: asyncHandler(async (req, res) => {
        const summary = await earningsService.summary(req.user!.id);
        return ok(res, { summary });
    }),
};

export default riderExtraController;
