import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * Chat — a conversation thread. Two participants only for MVP (customer ↔
 * rider during an active booking, or customer/rider ↔ support). Group chat is
 * out of scope. The `booking` field is optional so the same model backs both
 * booking chat and support chat.
 */
const ChatSchema = new Schema(
    {
        booking: { type: Schema.Types.ObjectId, ref: 'Booking', default: null, index: true },
        supportTicket: { type: Schema.Types.ObjectId, ref: 'SupportTicket', default: null, index: true },
        participants: [
            {
                userId: { type: Schema.Types.ObjectId, required: true },
                role: { type: String, enum: ['customer', 'rider', 'admin'], required: true },
                lastReadAt: { type: Date, default: null },
            },
        ],
        lastMessageAt: { type: Date, default: Date.now, index: true },
        lastMessagePreview: { type: String, default: '' },
        closed: { type: Boolean, default: false },
    },
    { timestamps: true }
);

ChatSchema.index({ 'participants.userId': 1, lastMessageAt: -1 });

export type ChatDoc = InferSchemaType<typeof ChatSchema> & { _id: any };
export const Chat = model<ChatDoc>('Chat', ChatSchema);
export default Chat;
