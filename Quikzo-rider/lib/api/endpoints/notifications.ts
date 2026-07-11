import { http } from '../client';

export type Notification = {
    _id: string;
    user: string;
    audience: 'customer' | 'rider' | 'admin';
    topic: 'booking' | 'trip' | 'payment' | 'wallet' | 'promo' | 'support' | 'system';
    title: string;
    body: string;
    imageUrl?: string;
    data?: Record<string, unknown>;
    readAt: string | null;
    createdAt: string;
};

export const notificationsApi = {
    async list(opts: { limit?: number; unreadOnly?: boolean } = {}): Promise<{ items: Notification[]; unread: number }> {
        return http.get('/notifications', {
            query: { limit: opts.limit, unreadOnly: opts.unreadOnly ? '1' : undefined },
        });
    },
    async markRead(id: string): Promise<void> {
        await http.patch(`/notifications/${id}/read`, {});
    },
    async markAllRead(): Promise<void> {
        await http.post('/notifications/read-all', {});
    },
    async remove(id: string): Promise<void> {
        await http.delete(`/notifications/${id}`);
    },
};

export default notificationsApi;
