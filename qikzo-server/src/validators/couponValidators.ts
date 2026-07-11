import { z } from 'zod';

export const quoteCouponSchema = z.object({
    code: z.string().min(2).max(40),
    subtotal: z.number().min(1),
    categorySlug: z.string().optional(),
});
