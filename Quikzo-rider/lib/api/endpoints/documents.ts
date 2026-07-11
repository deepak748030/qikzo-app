import { http } from '../client';

export type RiderDocument = {
    _id: string;
    kind: string;
    url: string;
    mimeType?: string;
    sizeBytes?: number;
    status: 'pending' | 'approved' | 'rejected';
    reviewNote?: string;
    expiresAt?: string | null;
    createdAt: string;
    updatedAt: string;
};

export type RiderKyc = {
    _id: string;
    status: 'not_started' | 'submitted' | 'in_review' | 'approved' | 'rejected';
    legalName?: string;
    dob?: string | null;
    aadhaarLast4?: string;
    panMasked?: string;
    dlNumber?: string;
    dlExpiry?: string | null;
    documentIds: string[];
    submittedAt?: string | null;
    rejectionReason?: string;
};

export const riderDocumentsApi = {
    async list(): Promise<RiderDocument[]> {
        const res = await http.get<{ items: RiderDocument[] }>('/riders/me/documents');
        return res.items;
    },
    async upload(input: { kind: string; url: string; mimeType?: string; sizeBytes?: number; expiresAt?: string | null }): Promise<RiderDocument> {
        const res = await http.post<{ document: RiderDocument }>('/riders/me/documents', input);
        return res.document;
    },
    async remove(id: string): Promise<void> {
        await http.delete(`/riders/me/documents/${id}`);
    },
    async getKyc(): Promise<RiderKyc> {
        const res = await http.get<{ kyc: RiderKyc }>('/riders/me/kyc');
        return res.kyc;
    },
    async submitKyc(patch: Partial<Pick<RiderKyc, 'legalName' | 'aadhaarLast4' | 'panMasked' | 'dlNumber'>> & { dob?: string; dlExpiry?: string }): Promise<RiderKyc> {
        const res = await http.post<{ kyc: RiderKyc }>('/riders/me/kyc', patch);
        return res.kyc;
    },
};

export default riderDocumentsApi;
