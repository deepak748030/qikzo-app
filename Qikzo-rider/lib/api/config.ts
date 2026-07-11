import Constants from 'expo-constants';

/**
 * Resolves the API base URL for the mobile client.
 *
 * Priority:
 *   1. EXPO_PUBLIC_API_URL (recommended — set per env)
 *   2. app.json > extra.apiUrl
 *   3. localhost fallback for dev
 */
function resolveBaseUrl(): string {
    const fromEnv = process.env.EXPO_PUBLIC_API_URL;
    if (fromEnv && fromEnv.trim()) return stripTrailingSlash(fromEnv.trim());

    const extra =
        (Constants.expoConfig?.extra as any)?.apiUrl ||
        (Constants.manifest2 as any)?.extra?.expoClient?.extra?.apiUrl;
    if (extra && typeof extra === 'string') return stripTrailingSlash(extra);

    return 'http://localhost:4000';
}

function stripTrailingSlash(u: string) {
    return u.endsWith('/') ? u.slice(0, -1) : u;
}

export const API_BASE_URL = resolveBaseUrl();

/** Canonical versioned prefix. Legacy `/api` still works server-side. */
export const API_PREFIX = '/api/v1';

export const API_URL = `${API_BASE_URL}${API_PREFIX}`;

/** Default request timeout (ms). Override per-call via `RequestOptions.timeoutMs`. */
export const DEFAULT_TIMEOUT_MS = 15_000;
