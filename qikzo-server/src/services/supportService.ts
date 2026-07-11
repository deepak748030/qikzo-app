import SupportTicket, { type TicketStatus } from '../models/SupportTicket';
import Message from '../models/Message';
import { errors } from '../lib/errors';
import notificationService from './notificationService';
import { audit } from './auditService';

/**
 * Support ticket service — customer/rider raise tickets, admins reply and
 * resolve. Thread messages live in the `Message` collection with
 * `channel = 'ticket'` and `channelId = ticket._id`.
 */
export const supportService = {
    async open(input: {
        userId: string;
        role: 'customer' | 'rider';
        subject: string;
        body?: string;
        topic?: string;
        bookingId?: string | null;
    }) {
        const subject = String(input.subject || '').trim();
        if (!subject) throw errors.badRequest('Subject required', 'SUBJECT_REQUIRED');
        const ticket = await SupportTicket.create({
            openedBy: input.userId,
            openedByRole: input.role,
            subject: subject.slice(0, 200),
            body: String(input.body || '').slice(0, 4000),
            topic: input.topic || 'general',
            booking: input.bookingId || null,
            status: 'open',
            lastMessageAt: new Date(),
        });
        if (input.body) {
            await Message.create({
                channel: 'ticket',
                channelId: ticket._id,
                senderId: input.userId,
                senderRole: input.role,
                kind: 'text',
                text: String(input.body).slice(0, 4000),
            });
        }
        void audit({ actorId: input.userId, actorRole: input.role, action: 'support.open', targetType: 'ticket', targetId: String(ticket._id), meta: { topic: ticket.topic } });
        return ticket;
    },

    async listMine(userId: string, opts: { status?: TicketStatus; limit?: number; cursor?: string } = {}) {
        const limit = Math.min(Math.max(opts.limit ?? 20, 1), 100);
        const filter: any = { openedBy: userId };
        if (opts.status) filter.status = opts.status;
        if (opts.cursor) filter._id = { $lt: opts.cursor };
        const items = await SupportTicket.find(filter).sort({ _id: -1 }).limit(limit + 1).lean();
        const hasMore = items.length > limit;
        return { items: items.slice(0, limit), nextCursor: hasMore ? String(items[limit - 1]._id) : null };
    },

    async get(userId: string, id: string, isAdmin = false) {
        const filter: any = { _id: id };
        if (!isAdmin) filter.openedBy = userId;
        const ticket = await SupportTicket.findOne(filter).lean();
        if (!ticket) throw errors.notFound('Ticket not found', 'TICKET_NOT_FOUND');
        const messages = await Message.find({ channel: 'ticket', channelId: id })
            .sort({ createdAt: 1 })
            .limit(200)
            .lean();
        return { ticket, messages };
    },

    async reply(input: {
        userId: string;
        role: 'customer' | 'rider' | 'admin';
        ticketId: string;
        text: string;
    }) {
        const text = String(input.text || '').trim();
        if (!text) throw errors.badRequest('Message required', 'MSG_REQUIRED');
        const filter: any = { _id: input.ticketId };
        if (input.role !== 'admin') filter.openedBy = input.userId;
        const ticket = await SupportTicket.findOne(filter);
        if (!ticket) throw errors.notFound('Ticket not found', 'TICKET_NOT_FOUND');
        if (ticket.status === 'closed') throw errors.badRequest('Ticket is closed', 'TICKET_CLOSED');

        const msg = await Message.create({
            channel: 'ticket',
            channelId: ticket._id,
            senderId: input.userId,
            senderRole: input.role,
            kind: 'text',
            text: text.slice(0, 4000),
        });
        ticket.lastMessageAt = new Date();
        if (input.role === 'admin' && ticket.status === 'open') ticket.status = 'pending';
        if (input.role !== 'admin' && ticket.status === 'pending') ticket.status = 'open';
        await ticket.save();

        // Notify the counterparty.
        if (input.role === 'admin') {
            void notificationService.emit({
                user: String(ticket.openedBy),
                audience: ticket.openedByRole,
                topic: 'system',
                title: 'Support replied',
                body: text.slice(0, 100),
                data: { event: 'support:reply', ticketId: String(ticket._id) },
            }).catch(() => {});
        }
        return { ticket, message: msg };
    },

    async setStatus(adminUserId: string, id: string, status: TicketStatus) {
        const ticket = await SupportTicket.findByIdAndUpdate(
            id,
            {
                status,
                assignedAdmin: adminUserId,
                ...(status === 'closed' || status === 'resolved' ? { closedAt: new Date() } : {}),
            },
            { new: true },
        );
        if (!ticket) throw errors.notFound('Ticket not found', 'TICKET_NOT_FOUND');
        void audit({ actorId: adminUserId, actorRole: 'admin', action: `support.${status}`, targetType: 'ticket', targetId: id });
        void notificationService.emit({
            user: String(ticket.openedBy),
            audience: ticket.openedByRole,
            topic: 'system',
            title: `Ticket ${status}`,
            body: `Your support ticket is now ${status}.`,
            data: { event: 'support:status', ticketId: String(ticket._id), status },
        }).catch(() => {});
        return ticket;
    },

    async listAdmin(opts: { status?: TicketStatus; limit?: number; cursor?: string } = {}) {
        const limit = Math.min(Math.max(opts.limit ?? 30, 1), 100);
        const filter: any = {};
        if (opts.status) filter.status = opts.status;
        if (opts.cursor) filter._id = { $lt: opts.cursor };
        const items = await SupportTicket.find(filter)
            .sort({ lastMessageAt: -1, _id: -1 })
            .limit(limit + 1)
            .lean();
        const hasMore = items.length > limit;
        return { items: items.slice(0, limit), nextCursor: hasMore ? String(items[limit - 1]._id) : null };
    },
};

export default supportService;
