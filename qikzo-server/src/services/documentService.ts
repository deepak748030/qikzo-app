import Document from '../models/Document';
import KYC from '../models/KYC';
import Rider from '../models/Rider';
import { errors } from '../lib/errors';
import { riderService } from './riderService';

export const documentService = {
    async listForRider(userId: string) {
        const rider = await riderService.getOrCreateForUser(userId);
        return Document.find({ owner: rider._id, ownerRole: 'rider' })
            .sort({ createdAt: -1 })
            .lean();
    },

    async upload(userId: string, input: { kind: string; url: string; mimeType?: string; sizeBytes?: number; expiresAt?: string | null }) {
        const rider = await riderService.getOrCreateForUser(userId);
        // Replace any existing document of the same kind (latest wins).
        await Document.deleteMany({ owner: rider._id, ownerRole: 'rider', kind: input.kind });
        const doc = await Document.create({
            owner: rider._id,
            ownerRole: 'rider',
            kind: input.kind,
            url: input.url,
            mimeType: input.mimeType || '',
            sizeBytes: input.sizeBytes || 0,
            expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
            status: 'pending',
        });
        // Ensure a KYC dossier exists and reflects the latest uploads so the
        // admin dashboard can review documents even before the rider submits
        // the KYC form. We only bump status forward from not_started/rejected —
        // never overwrite an already approved/in_review state.
        const allDocs = await Document.find({ owner: rider._id, ownerRole: 'rider' }).select('_id').lean();
        const existing = await KYC.findOne({ rider: rider._id });
        const nextStatus = !existing || existing.status === 'not_started' || existing.status === 'rejected'
            ? 'submitted'
            : existing.status;
        await KYC.findOneAndUpdate(
            { rider: rider._id },
            {
                $set: {
                    documentIds: allDocs.map((d) => d._id),
                    status: nextStatus,
                    ...(nextStatus === 'submitted' && !existing?.submittedAt ? { submittedAt: new Date() } : {}),
                },
            },
            { new: true, upsert: true },
        );
        if (rider.kycStatus === 'not_started' || rider.kycStatus === 'rejected') {
            rider.kycStatus = 'submitted';
            await rider.save();
        }
        return doc;
    },

    async remove(userId: string, id: string) {
        const rider = await riderService.getOrCreateForUser(userId);
        const r = await Document.deleteOne({ _id: id, owner: rider._id, ownerRole: 'rider' });
        if (!r.deletedCount) throw errors.notFound('Document not found', 'DOC_NOT_FOUND');
    },

    async getKyc(userId: string) {
        const rider = await riderService.getOrCreateForUser(userId);
        let kyc = await KYC.findOne({ rider: rider._id });
        if (!kyc) kyc = await KYC.create({ rider: rider._id, status: 'not_started' });
        return kyc;
    },

    async submitKyc(userId: string, patch: {
        legalName?: string; dob?: string; aadhaarLast4?: string;
        panMasked?: string; dlNumber?: string; dlExpiry?: string;
    }) {
        const rider = await riderService.getOrCreateForUser(userId);
        const docs = await Document.find({ owner: rider._id, ownerRole: 'rider' }).select('_id').lean();
        const kyc = await KYC.findOneAndUpdate(
            { rider: rider._id },
            {
                $set: {
                    legalName: patch.legalName?.trim() ?? '',
                    dob: patch.dob ? new Date(patch.dob) : null,
                    aadhaarLast4: patch.aadhaarLast4?.slice(-4) ?? '',
                    panMasked: patch.panMasked ?? '',
                    dlNumber: patch.dlNumber ?? '',
                    dlExpiry: patch.dlExpiry ? new Date(patch.dlExpiry) : null,
                    documentIds: docs.map((d) => d._id),
                    status: 'submitted',
                    submittedAt: new Date(),
                    rejectionReason: '',
                },
            },
            { new: true, upsert: true },
        );
        rider.kycStatus = 'submitted';
        await rider.save();
        return kyc;
    },
};

export default documentService;
