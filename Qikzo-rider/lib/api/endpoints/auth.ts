import { http } from '../client';
import { tokenStore } from '../tokenStore';
import type { AuthTokens, AuthUser } from '../types';

export const authApi = {
    async requestOtp(phone: string) {
        return http.post<{ devCode?: string }>('/auth/request-otp', { phone }, { auth: false });
    },

    async verifyOtp(phone: string, code: string): Promise<AuthTokens> {
        const deviceId = await tokenStore.getDeviceId();
        const res = await http.post<AuthTokens>(
            '/auth/verify-otp',
            { phone, code, deviceId },
            { auth: false }
        );
        await tokenStore.set({
            accessToken: res.accessToken,
            refreshToken: res.refreshToken,
        });
        return res;
    },

    async me(): Promise<AuthUser> {
        const res = await http.get<{ user: AuthUser }>('/auth/me');
        return res.user;
    },

    async logout(opts: { all?: boolean } = {}) {
        const { refreshToken } = tokenStore.get();
        try {
            await http.post('/auth/logout', { refreshToken, all: !!opts.all });
        } catch {
            /* best-effort — always clear local */
        }
        await tokenStore.clear();
    },
};

export default authApi;
