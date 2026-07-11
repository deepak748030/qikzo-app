import { z } from 'zod';

export const requestOtpSchema = z.object({
    phone: z.string().trim().min(10).max(15),
});

export const verifyOtpSchema = z.object({
    phone: z.string().trim().min(10).max(15),
    code: z.string().trim().regex(/^\d{4,8}$/),
    deviceId: z.string().max(128).optional(),
});

export const refreshSchema = z.object({
    refreshToken: z.string().min(20),
});

export const logoutSchema = z.object({
    refreshToken: z.string().min(20).optional(),
    all: z.boolean().optional(),
});
