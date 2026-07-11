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
    // Extended profile fields.
    dob: z.string().regex(/^\d{2}-\d{2}-\d{4}$/, 'DOB must be DD-MM-YYYY').optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    address: z.string().max(300).optional(),
    city: z.string().max(80).optional(),
    pincode: z.string().regex(/^\d{6}$/, 'PIN must be 6 digits').optional(),
    emergencyName: z.string().max(80).optional(),
    emergencyPhone: z.string().regex(/^\d{10}$/, 'Must be 10 digits').optional(),
    avatarUrl: z.string().max(500).optional(),
});
