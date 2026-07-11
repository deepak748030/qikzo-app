import { Schema, model, type InferSchemaType } from 'mongoose';

export const NOTIFICATION_TOPICS = [
    'booking', 'trip', 'payment', 'wallet', 'promo', 'support', 'system',
] as const;
export type NotificationTopic = (typeof NOTIFICATION_TOPICS)[number];

/**
 * Notification — in-app inbox row. Push delivery is a side-effect of writing
 * one of these (see Phase 4.4). `data` is opaque routing payload consumed by
 * the mobile app (deep-links, ids).
 */
const NotificationSchema = new Schema(
    {
        user: { type: Schema.Types.ObjectId, required: true, index: true },
        audience: { type: String, enum: ['customer', 'rider', 'admin'], default: 'customer', index: true },
        topic: { type: String, enum: NOTIFICATION_TOPICS, required: true, index: true },
        title: { type: String, required: true },
        body: { type: String, default: '' },
        imageUrl: { type: String, default: '' },
        data: { type: Schema.Types.Mixed, default: {} },
        readAt: { type: Date, default: null },
        sentPush: { type: Boolean, default: false },
    },
    { timestamps: true }
);

NotificationSchema.index({ user: 1, createdAt: -1 });
NotificationSchema.index({ user: 1, readAt: 1 });

export type NotificationDoc = InferSchemaType<typeof NotificationSchema> & { _id: any };
export const Notification = model<NotificationDoc>('Notification', NotificationSchema);
export default Notification;
