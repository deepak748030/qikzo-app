import { Schema, model, type InferSchemaType } from 'mongoose';

export const TICKET_STATUSES = ['open', 'pending', 'resolved', 'closed'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

/**
 * SupportTicket — user- or rider-raised help request. Threaded conversation
 * lives in the `Message` collection with `channel = 'ticket'` and `channelId`
 * = this ticket _id (see Message model).
 */
const SupportTicketSchema = new Schema(
    {
        openedBy: { type: Schema.Types.ObjectId, required: true, index: true },
        openedByRole: { type: String, enum: ['customer', 'rider'], required: true },
        subject: { type: String, required: true },
        body: { type: String, default: '' },
        topic: { type: String, default: 'general' },
        booking: { type: Schema.Types.ObjectId, ref: 'Booking', default: null, index: true },
        status: { type: String, enum: TICKET_STATUSES, default: 'open', index: true },
        assignedAdmin: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
        lastMessageAt: { type: Date, default: Date.now },
        closedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

SupportTicketSchema.index({ openedBy: 1, createdAt: -1 });
SupportTicketSchema.index({ status: 1, lastMessageAt: -1 });

export type SupportTicketDoc = InferSchemaType<typeof SupportTicketSchema> & { _id: any };
export const SupportTicket = model<SupportTicketDoc>('SupportTicket', SupportTicketSchema);
export default SupportTicket;
