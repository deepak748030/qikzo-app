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
    extraPickups: z.array(PointSchema).max(3).optional(),
});

export const createBookingSchema = z.object({
    mode: z.enum(['ride', 'delivery']).optional(),
    categorySlug: z.string().min(1),
    vehicleTypeSlug: z.string().min(1).max(40).optional(),
    pickup: PointSchema,
    extraPickups: z.array(PointSchema).max(3).optional(),
    drop: PointSchema,
    notes: z.string().max(500).optional(),
    noteImages: z.array(z.string().min(1).max(500)).max(4).optional(),
    recipientPhone: z.string().max(20).optional(),
    recipientName: z.string().max(80).optional(),
    payment: z.enum(['cash', 'upi', 'wallet']).optional(),
    couponCode: z.string().min(2).max(40).optional(),
    // ISO string; must be in the future when scheduling.
    scheduledAt: z.string().datetime().optional(),
    // --- Food/Grocery banner flow (optional; omitted by every existing client) ---
    bannerId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid banner id').optional(),
    storeInputs: z
        .array(
            z.object({
                storeId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid store id'),
                storeName: z.string().max(120).optional(),
                note: z.string().min(1).max(300),
            })
        )
        .max(10)
        .optional(),
});

export const updateStatusSchema = z.object({
    status: z.enum(BOOKING_STATUSES as unknown as [string, ...string[]]),
    note: z.string().max(500).optional(),
});

export const cancelSchema = z.object({
    reason: z.string().max(500).optional(),
});
