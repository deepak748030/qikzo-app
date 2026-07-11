import { z } from 'zod';

export const openTicketSchema = z.object({
    subject: z.string().trim().min(3, 'Subject too short').max(200),
    body: z.string().trim().max(4000).optional(),
    topic: z.string().trim().max(50).optional(),
    bookingId: z.string().trim().min(1).optional().nullable(),
    role: z.enum(['customer', 'rider']).optional(),
});

export const replyTicketSchema = z.object({
    text: z.string().trim().min(1, 'Message required').max(4000),
});

export const ticketStatusSchema = z.object({
    status: z.enum(['open', 'pending', 'resolved', 'closed']),
});

export const listTicketsQuery = z.object({
    status: z.enum(['open', 'pending', 'resolved', 'closed']).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    cursor: z.string().optional(),
});
