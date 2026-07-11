import { http } from '../client';

/**
 * Push-notification device registry. The mobile app calls `register()` once
 * per launch (idempotent server-side) and `unregister()` on sign-out.
 */
export const devicesApi = {
    register(input: {
        token: string;
        platform: 'ios' | 'android' | 'web';
        audience: 'customer' | 'rider';
        model?: string;
        appVersion?: string;
    }) {
        return http<{ device: any }>('/devices', { method: 'POST', body: input });
    },
    unregister(token: string) {
        return http<{}>('/devices', { method: 'DELETE', body: { token } });
    },
};

export default devicesApi;
