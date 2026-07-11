import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Token storage for the mobile auth session.
 *
 * We use AsyncStorage today (already a dependency). Swap for `expo-secure-store`
 * in Phase 5 (security hardening) without touching call-sites — the interface
 * is intentionally minimal.
 */
const K_ACCESS = 'qz.auth.accessToken';
const K_REFRESH = 'qz.auth.refreshToken';
const K_DEVICE = 'qz.auth.deviceId';

export type TokenPair = {
    accessToken: string | null;
    refreshToken: string | null;
};

let memory: TokenPair = { accessToken: null, refreshToken: null };
let hydrated = false;

export const tokenStore = {
    async hydrate(): Promise<TokenPair> {
        if (hydrated) return memory;
        const [a, r] = await Promise.all([
            AsyncStorage.getItem(K_ACCESS),
            AsyncStorage.getItem(K_REFRESH),
        ]);
        memory = { accessToken: a, refreshToken: r };
        hydrated = true;
        return memory;
    },

    get(): TokenPair {
        return memory;
    },

    async set(pair: Partial<TokenPair>) {
        memory = { ...memory, ...pair };
        await Promise.all([
            pair.accessToken !== undefined
                ? pair.accessToken
                    ? AsyncStorage.setItem(K_ACCESS, pair.accessToken)
                    : AsyncStorage.removeItem(K_ACCESS)
                : Promise.resolve(),
            pair.refreshToken !== undefined
                ? pair.refreshToken
                    ? AsyncStorage.setItem(K_REFRESH, pair.refreshToken)
                    : AsyncStorage.removeItem(K_REFRESH)
                : Promise.resolve(),
        ]);
    },

    async clear() {
        memory = { accessToken: null, refreshToken: null };
        await Promise.all([AsyncStorage.removeItem(K_ACCESS), AsyncStorage.removeItem(K_REFRESH)]);
    },

    async getDeviceId(): Promise<string> {
        let id = await AsyncStorage.getItem(K_DEVICE);
        if (!id) {
            id = `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
            await AsyncStorage.setItem(K_DEVICE, id);
        }
        return id;
    },
};

export default tokenStore;
