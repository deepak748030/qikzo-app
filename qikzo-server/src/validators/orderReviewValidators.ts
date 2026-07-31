import { z } from 'zod';

const star = z.number().int().min(1).max(5);

export const submitOrderReviewSchema = z.object({
    bookingId: z.string().min(1),
    stars: star,
    quality: star.optional(),
    packaging: star.optional(),
    accuracy: star.optional(),
    comment: z.string().max(800).optional(),
    tags: z.array(z.string().max(40)).max(8).optional(),
    photos: z.array(z.string().max(500)).max(4).optional(),
});

export type SubmitOrderReviewInput = z.infer<typeof submitOrderReviewSchema>;
