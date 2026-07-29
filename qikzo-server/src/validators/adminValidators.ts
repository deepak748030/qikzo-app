import { z } from 'zod';

export const listQuerySchema = z.object({
    status: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
    cursor: z.string().optional(),
    q: z.string().optional(),
    active: z.enum(['true', 'false']).optional(),
    online: z.enum(['true', 'false']).optional(),
    kycStatus: z.string().optional(),
    role: z.enum(['customer', 'rider', 'admin']).optional(),
    blocked: z.enum(['true', 'false']).optional(),
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

export const blockUserSchema = z.object({
    blocked: z.boolean(),
    reason: z.string().max(500).optional(),
});

export const updateUserSchema = z.object({
    name: z.string().min(1).max(120).optional(),
    email: z.string().email().max(200).optional().or(z.literal('')),
    role: z.enum(['customer', 'rider', 'admin']).optional(),
});
