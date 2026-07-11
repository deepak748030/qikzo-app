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
        return Document.create({
            owner: rider._id,
            ownerRole: 'rider',
            kind: input.kind,
            url: input.url,
            mimeType: input.mimeType || '',
            sizeBytes: input.sizeBytes || 0,
            expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
            status: 'pending',
        });
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
