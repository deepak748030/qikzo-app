import { http } from '../client';

export type SupportTicket = {
    _id: string;
    subject: string;
    body: string;
    topic: string;
    status: 'open' | 'pending' | 'resolved' | 'closed';
    booking?: string | null;
    lastMessageAt: string;
    createdAt: string;
};

export type SupportMessage = {
    _id: string;
    senderRole: 'customer' | 'rider' | 'admin' | 'system';
    text: string;
    createdAt: string;
};

export const supportApi = {
    async open(input: { subject: string; body?: string; topic?: string; bookingId?: string | null }): Promise<SupportTicket> {
        const res = await http.post<{ ticket: SupportTicket }>('/support', { ...input, role: 'customer' });
        return res.ticket;
    },
    async list(status?: SupportTicket['status']): Promise<SupportTicket[]> {
        const res = await http.get<{ items: SupportTicket[] }>('/support', { query: status ? { status } : undefined });
        return res.items;
    },
    async get(id: string): Promise<{ ticket: SupportTicket; messages: SupportMessage[] }> {
        return http.get(`/support/${id}`);
    },
    async reply(id: string, text: string): Promise<SupportMessage> {
        const res = await http.post<{ message: SupportMessage }>(`/support/${id}/reply`, { text });
        return res.message;
    },
};

export default supportApi;
