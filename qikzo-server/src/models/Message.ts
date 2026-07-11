import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * Message — a single line in a Chat OR a SupportTicket. `channel` tells the
 * consumer which one; `channelId` is the parent doc _id.
 */
const MessageSchema = new Schema(
    {
        channel: { type: String, enum: ['chat', 'ticket'], required: true, index: true },
        channelId: { type: Schema.Types.ObjectId, required: true, index: true },
        senderId: { type: Schema.Types.ObjectId, required: true, index: true },
        senderRole: { type: String, enum: ['customer', 'rider', 'admin', 'system'], required: true },
        kind: { type: String, enum: ['text', 'image', 'location', 'system'], default: 'text' },
        text: { type: String, default: '' },
        attachmentUrl: { type: String, default: '' },
        location: {
            lat: { type: Number, default: null },
            lng: { type: Number, default: null },
        },
        readBy: [{ type: Schema.Types.ObjectId }],
    },
    { timestamps: true }
);

MessageSchema.index({ channel: 1, channelId: 1, createdAt: -1 });

export type MessageDoc = InferSchemaType<typeof MessageSchema> & { _id: any };
export const Message = model<MessageDoc>('Message', MessageSchema);
export default Message;
