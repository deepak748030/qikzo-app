import { z } from 'zod';
import { TRIP_STAGES } from '../models/Trip';

export const updateRiderStatusSchema = z.object({
    online: z.boolean().optional(),
    available: z.boolean().optional(),
}).refine((v) => v.online !== undefined || v.available !== undefined, {
    message: 'At least one of `online` or `available` is required',
});

export const updateRiderLocationSchema = z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    heading: z.number().min(0).max(360).optional(),
    speed: z.number().min(0).max(300).optional(),
});

export const updateRiderVehicleSchema = z.object({
    vehicle: z.string().min(1).max(60),
    vehicleNo: z.string().min(3).max(20),
});

// Rider-actionable trip stages (subset — no re-assigning; no going back).
export const RIDER_TRIP_STAGES = ['arriving', 'arrived', 'started', 'completed'] as const;

export const setTripStageSchema = z.object({
    stage: z.enum(RIDER_TRIP_STAGES as unknown as [string, ...string[]]),
});

export const tripCancelSchema = z.object({
    reason: z.string().max(500).optional(),
});

export const bookingActionSchema = z.object({
    reason: z.string().max(500).optional(),
});

// Runtime guard used by the service.
export type RiderTripStage = (typeof RIDER_TRIP_STAGES)[number];
export const ALL_TRIP_STAGES = TRIP_STAGES;
