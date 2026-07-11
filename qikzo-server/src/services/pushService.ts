import Device from '../models/Device';
import { logger } from '../lib/logger';

/**
 * Expo push delivery.
 *
 * Sends via the Expo Push API (https://exp.host/--/api/v2/push/send). We POST
 * messages in chunks of 100, then look at the receipt tickets synchronously —
 * `DeviceNotRegistered` tokens are pruned so we stop pushing to dead devices.
 * A missing/invalid token is a soft failure; we never throw upstream.
 */
const EXPO_ENDPOINT = 'https://exp.host/--/api/v2/push/send';
const CHUNK = 100;

export type PushInput = {
    userId: string;
    audience?: 'customer' | 'rider' | 'admin';
    title: string;
    body?: string;
    data?: Record<string, unknown>;
};

function isExpoToken(t: string): boolean {
    return typeof t === 'string' && (t.startsWith('ExponentPushToken[') || t.startsWith('ExpoPushToken['));
}

export const pushService = {
    async registerDevice(input: {
        userId: string;
        audience: 'customer' | 'rider';
        token: string;
        platform: 'ios' | 'android' | 'web';
        model?: string;
        appVersion?: string;
    }) {
        if (!isExpoToken(input.token)) return null;
        return Device.findOneAndUpdate(
            { user: input.userId, token: input.token },
            {
                user: input.userId,
                token: input.token,
                audience: input.audience,
                platform: input.platform,
                model: input.model || '',
                appVersion: input.appVersion || '',
                lastSeenAt: new Date(),
                revokedAt: null,
            },
            { upsert: true, new: true, setDefaultsOnInsert: true },
        );
    },

    async unregisterDevice(userId: string, token: string) {
        await Device.updateOne({ user: userId, token }, { revokedAt: new Date() });
    },

    async sendToUser(input: PushInput): Promise<void> {
        const devices = await Device.find({ user: input.userId, revokedAt: null }).lean();
        const tokens = devices.map((d) => d.token).filter(isExpoToken);
        if (!tokens.length) return;
        await this._send(tokens, {
            title: input.title,
            body: input.body || '',
            data: { ...(input.data || {}), audience: input.audience || 'customer' },
        });
    },

    async _send(tokens: string[], msg: { title: string; body: string; data: Record<string, unknown> }) {
        for (let i = 0; i < tokens.length; i += CHUNK) {
            const batch = tokens.slice(i, i + CHUNK).map((to) => ({
                to,
                sound: 'default',
                title: msg.title,
                body: msg.body,
                data: msg.data,
                priority: 'high',
                channelId: 'default',
            }));
            try {
                const res = await fetch(EXPO_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'accept': 'application/json',
                        'accept-encoding': 'gzip, deflate',
                        'content-type': 'application/json',
                    },
                    body: JSON.stringify(batch),
                });
                const json: any = await res.json().catch(() => ({}));
                const tickets: any[] = json?.data || [];
                // Prune tokens the receipt reports as unregistered.
                const dead: string[] = [];
                tickets.forEach((t, idx) => {
                    if (t?.status === 'error' && t?.details?.error === 'DeviceNotRegistered') {
                        dead.push(batch[idx].to);
                    }
                });
                if (dead.length) {
                    await Device.updateMany({ token: { $in: dead } }, { revokedAt: new Date() });
                    logger.info({ dead }, 'push:pruned_dead_tokens');
                }
            } catch (err) {
                logger.warn({ err }, 'push:batch_failed');
            }
        }
    },
};

export default pushService;
