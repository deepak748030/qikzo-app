import { z } from 'zod';

export const createPlaceSchema = z.object({
    label: z.string().min(1).max(60),
    address: z.string().min(1).max(300),
    emoji: z.string().max(8).optional(),
    coord: z.object({ lat: z.number(), lng: z.number() }).nullable().optional(),
});

export const updateMeSchema = z.object({
    name: z.string().max(80).optional(),
    email: z.string().email().max(120).optional(),
    onboarded: z.boolean().optional(),
    location: z.union([z.string().max(200), z.null()]).optional(),
});
