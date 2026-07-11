import { z } from 'zod';

export const registerDeviceSchema = z.object({
    token: z.string().min(10),
    platform: z.enum(['ios', 'android', 'web']),
    audience: z.enum(['customer', 'rider']).default('customer'),
    model: z.string().optional(),
    appVersion: z.string().optional(),
});

export const unregisterDeviceSchema = z.object({
    token: z.string().min(10),
});
