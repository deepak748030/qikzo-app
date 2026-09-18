import { z } from 'zod';

/**
 * Validators for the Food/Grocery banner management surface (admin CRUD for
 * merchants + banners, and the public list/detail query). Kept in their own
 * file so the existing admin/booking validators stay untouched.
 */

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

const hoursSchema = z.object({
    day: z.string().min(1).max(40),
    open: z.string().max(10).optional(),
    close: z.string().max(10).optional(),
});

const offerSchema = z.object({
    title: z.string().min(1).max(120),
    detail: z.string().max(300).optional(),
    active: z.boolean().optional(),
});

const menuItemSchema = z.object({
    name: z.string().min(1).max(120),
    price: z.number().min(0).nullable().optional(),
    category: z.string().max(60).optional(),
    veg: z.boolean().nullable().optional(),
});

const menuSchema = z.object({
    imageUrl: z.string().max(500).optional(),
    items: z.array(menuItemSchema).max(200).optional(),
});

// ---------- Restaurants / stores (admin) ----------

export const createStoreSchema = z.object({
    slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/, 'Slug may contain lowercase letters, numbers and dashes'),
    name: z.string().min(1).max(120),
    kind: z.enum(['restaurant', 'store']).default('restaurant'),
    categorySlug: z.enum(['food', 'groceries']).optional(),
    description: z.string().max(2000).optional(),
    imageUrl: z.string().max(500).optional(),
    address: z.string().max(300).optional(),
    coord: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).nullable().optional(),
    hours: z.array(hoursSchema).max(14).optional(),
    offers: z.array(offerSchema).max(10).optional(),
    menu: menuSchema.optional(),
    ratingSummary: z
        .object({ avg: z.number().min(0).max(5), count: z.number().int().min(0) })
        .optional(),
    active: z.boolean().optional(),
    order: z.number().optional(),
});

export const updateStoreSchema = createStoreSchema.omit({ slug: true }).partial();

export const storeListQuerySchema = z
    .object({
        kind: z.enum(['restaurant', 'store']).optional(),
        categorySlug: z.enum(['food', 'groceries']).optional(),
        active: z.enum(['true', 'false']).optional(),
        q: z.string().max(120).optional(),
        limit: z.coerce.number().int().min(1).max(200).optional(),
        cursor: z.string().optional(),
    })
    .partial();

// ---------- Category banners (admin) ----------

export const createCategoryBannerSchema = z.object({
    title: z.string().min(1).max(140),
    // Only these two are ever allowed — mirrors the admin dropdown.
    type: z.enum(['food', 'grocery']),
    imageUrl: z.string().min(1).max(500),
    description: z.string().max(1000).optional(),
    /** Empty array (or omitted) means the banner applies to ALL merchants of its type. */
    storeIds: z.array(objectId).max(100).optional(),
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
