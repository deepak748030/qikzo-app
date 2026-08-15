import Notification, { type NotificationTopic } from '../models/Notification';
import { errors } from '../lib/errors';
import pushService from './pushService';

export const notificationService = {
    async list(userId: string, opts: { limit?: number; skip?: number; unreadOnly?: boolean } = {}) {
        const limit = Math.min(Math.max(opts.limit ?? 30, 1), 100);
        const skip = Math.max(opts.skip ?? 0, 0);
        const filter: any = { user: userId };
        if (opts.unreadOnly) filter.readAt = null;
        const [items, unread, total] = await Promise.all([
            Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            Notification.countDocuments({ user: userId, readAt: null }),
            Notification.countDocuments(filter),
        ]);
        return { items, unread, total, hasMore: skip + items.length < total };
    },

    async markRead(userId: string, id: string) {
        const n = await Notification.findOneAndUpdate(
            { _id: id, user: userId },
            { readAt: new Date() },
            { new: true },
        );
        if (!n) throw errors.notFound('Notification not found', 'NOTIFICATION_NOT_FOUND');
        return n;
    },

    async markAllRead(userId: string) {
        const r = await Notification.updateMany({ user: userId, readAt: null }, { readAt: new Date() });
        return { updated: r.modifiedCount };
    },

    async remove(userId: string, id: string) {
        const r = await Notification.deleteOne({ _id: id, user: userId });
        if (!r.deletedCount) throw errors.notFound('Notification not found', 'NOTIFICATION_NOT_FOUND');
    },

    /**
     * Server-side emit — writes an inbox row AND best-effort pushes to every
     * registered device for the user. Callers pass `push: false` to skip
     * delivery (e.g. silent/system rows).
     */
    async emit(input: {
        user: string;
        audience?: 'customer' | 'rider' | 'admin';
        topic: NotificationTopic;
        title: string;
        body?: string;
        data?: Record<string, unknown>;
        push?: boolean;
    }) {
        const doc = await Notification.create({
            user: input.user,
            audience: input.audience ?? 'customer',
            topic: input.topic,
            title: input.title,
            body: input.body ?? '',
            data: input.data ?? {},
        });
        if (input.push !== false) {
            void pushService
                .sendToUser({
                    userId: input.user,
                    audience: input.audience === 'admin' ? 'customer' : (input.audience ?? 'customer'),
                    title: input.title,
                    body: input.body ?? '',
                    data: { ...(input.data || {}), topic: input.topic, notificationId: String(doc._id) },
                })
                .then(() => Notification.updateOne({ _id: doc._id }, { sentPush: true }).catch(() => {}))
                .catch(() => {});
        }
        return doc;
    },
};


export default notificationService;
