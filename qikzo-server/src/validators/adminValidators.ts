import { z } from 'zod';

export const listQuerySchema = z.object({
    status: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    cursor: z.string().optional(),
    q: z.string().optional(),
    online: z.enum(['true', 'false']).optional(),
    kycStatus: z.string().optional(),
}).partial();

export const rejectSchema = z.object({
    reason: z.string().max(500).optional(),
});

export const approvePayoutSchema = z.object({
    providerRef: z.string().max(120).optional(),
});

export const blockRiderSchema = z.object({
    blocked: z.boolean(),
    reason: z.string().max(500).optional(),
});
