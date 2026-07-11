import { z } from 'zod';

export const submitRatingSchema = z.object({
    bookingId: z.string().min(1),
    stars: z.number().int().min(1).max(5),
    comment: z.string().max(500).optional(),
    tags: z.array(z.string().max(40)).max(8).optional(),
    tip: z.number().min(0).max(5000).optional(),
});
