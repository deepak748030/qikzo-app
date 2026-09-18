import { z } from 'zod';

/**
 * Validators for the Food/Grocery banner surface (admin CRUD + the public
 * list/detail query). Kept in their own file so the existing admin and
 * booking validators stay untouched.
 */

const coordSchema = z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
});

// ---------- Category banners (admin) ----------

export const createCategoryBannerSchema = z.object({
    title: z.string().min(1).max(140),
    // Only these two are ever allowed — mirrors the admin dropdown.
    type: z.enum(['food', 'grocery']),
    imageUrl: z.string().min(1).max(500),
    description: z.string().max(1000).optional(),
    address: z.string().max(300).optional(),
    /** Required: this is what the customer app uses as the pickup location. */
    coord: coordSchema,
    active: z.boolean().optional(),
    order: z.number().optional(),
});

export const updateCategoryBannerSchema = createCategoryBannerSchema.partial();

export const bannerListQuerySchema = z
    .object({
        type: z.enum(['food', 'grocery']).optional(),
        active: z.enum(['true', 'false']).optional(),
        lat: z.coerce.number().min(-90).max(90).optional(),
        lng: z.coerce.number().min(-180).max(180).optional(),
        limit: z.coerce.number().int().min(1).max(100).optional(),
        cursor: z.string().optional(),
    })
    .partial();
