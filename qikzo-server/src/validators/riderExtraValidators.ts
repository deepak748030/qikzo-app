import { z } from 'zod';

export const uploadDocumentSchema = z.object({
    kind: z.enum([
        'aadhaar_front', 'aadhaar_back', 'pan', 'dl_front', 'dl_back',
        'rc_front', 'rc_back', 'insurance', 'vehicle_photo', 'profile_photo', 'other',
    ]),
    url: z.string().min(1).max(1000),
    mimeType: z.string().max(120).optional(),
    sizeBytes: z.number().int().nonnegative().optional(),
    expiresAt: z.union([z.string(), z.null()]).optional(),
});

export const submitKycSchema = z.object({
    legalName: z.string().max(120).optional(),
    dob: z.string().max(40).optional(),
    aadhaarLast4: z.string().max(12).optional(),
    panMasked: z.string().max(20).optional(),
    dlNumber: z.string().max(40).optional(),
    dlExpiry: z.string().max(40).optional(),
});

export const setPayoutMethodSchema = z.object({
    method: z.enum(['upi', 'bank']),
    accountHolder: z.string().max(120).optional(),
    accountNumber: z.string().max(24).optional(),
    ifsc: z.string().max(11).optional(),
    bankName: z.string().max(80).optional(),
    upiId: z.string().max(80).optional(),
});

export const requestPayoutSchema = z.object({
    amount: z.number().positive().max(1_000_000),
});
