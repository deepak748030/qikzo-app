import { z } from 'zod';
import { BOOKING_STATUSES } from '../models/Booking';

const PointSchema = z.object({
    address: z.string().min(1),
    lat: z.number().nullable().optional(),
    lng: z.number().nullable().optional(),
});

export const estimateSchema = z.object({
    pickup: z.union([z.string(), PointSchema]),
    drop: z.union([z.string(), PointSchema]),
    pickupCoord: z.object({ lat: z.number(), lng: z.number() }).nullable().optional(),
    dropCoord: z.object({ lat: z.number(), lng: z.number() }).nullable().optional(),
});

export const createBookingSchema = z.object({
    mode: z.enum(['ride', 'delivery']).optional(),
    categorySlug: z.string().min(1),
    pickup: PointSchema,
    drop: PointSchema,
    notes: z.string().max(500).optional(),
    recipientPhone: z.string().max(20).optional(),
    payment: z.enum(['cash', 'upi']).optional(),
    couponCode: z.string().min(2).max(40).optional(),
    // ISO string; must be in the future when scheduling.
    scheduledAt: z.string().datetime().optional(),
});

export const updateStatusSchema = z.object({
    status: z.enum(BOOKING_STATUSES as unknown as [string, ...string[]]),
    note: z.string().max(500).optional(),
});

export const cancelSchema = z.object({
    reason: z.string().max(500).optional(),
});
