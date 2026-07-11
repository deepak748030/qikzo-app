import { API_URL, DEFAULT_TIMEOUT_MS } from './config';
import { ApiError } from './errors';
import { tokenStore } from './tokenStore';
import type { ApiEnvelope, AuthTokens } from './types';

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export type RequestOptions = {
    method?: HttpMethod;
    body?: unknown;
    query?: Record<string, string | number | boolean | null | undefined>;
    headers?: Record<string, string>;
    /** Skip Authorization header + refresh handling (auth endpoints). */
    auth?: boolean;
    timeoutMs?: number;
    /** Internal — set by refresh retry to prevent recursion. */
    _isRetry?: boolean;
};

/** Listener fires exactly once when the client gives up trying to refresh. */
type UnauthorizedListener = () => void;
const unauthorizedListeners: UnauthorizedListener[] = [];
export function onUnauthorized(cb: UnauthorizedListener) {
    unauthorizedListeners.push(cb);
    return () => {
        const i = unauthorizedListeners.indexOf(cb);
        if (i >= 0) unauthorizedListeners.splice(i, 1);
    };
}
function fireUnauthorized() {
    unauthorizedListeners.slice().forEach((cb) => {
        try {
            cb();
        } catch {
            /* swallow */
        }
    });
}

// ---------- Refresh coordination ----------
// Multiple in-flight requests can hit a 401 at the same time. We collapse them
// onto a single refresh promise so we only mint one new access token.
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
    if (refreshInFlight) return refreshInFlight;
    const { refreshToken } = tokenStore.get();
    if (!refreshToken) return null;

    refreshInFlight = (async () => {
        try {
            const deviceId = await tokenStore.getDeviceId();
            const res = await fetch(`${API_URL}/auth/refresh`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ refreshToken, deviceId }),
            });
            const json = await safeJson(res);
            if (!res.ok || !json?.success) return null;
            const next: AuthTokens | undefined = json;
            if (!next?.accessToken || !next?.refreshToken) return null;
            await tokenStore.set({
                accessToken: next.accessToken,
                refreshToken: next.refreshToken,
            });
            return next.accessToken;
        } catch {
            return null;
        } finally {
            refreshInFlight = null;
        }
    })();

    return refreshInFlight;
}

async function safeJson(res: Response): Promise<any> {
    try {
        return await res.json();
    } catch {
        return null;
    }
}

function buildQuery(query?: RequestOptions['query']): string {
    if (!query) return '';
    const parts: string[] = [];
    for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === null) continue;
        parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    }
    return parts.length ? `?${parts.join('&')}` : '';
}

/**
 * Core request. Returns the parsed envelope on success and throws `ApiError`
 * on any non-2xx or network failure. Automatically:
 *   - attaches Bearer token
 *   - refreshes once on 401 and replays the request
 *   - fires `onUnauthorized` listeners when refresh ultimately fails
 */
export async function request<T = any>(path: string, opts: RequestOptions = {}): Promise<ApiEnvelope<T>> {
    const {
        method = 'GET',
        body,
        query,
        headers = {},
        auth = true,
        timeoutMs = DEFAULT_TIMEOUT_MS,
        _isRetry = false,
    } = opts;

    const url = `${API_URL}${path.startsWith('/') ? path : `/${path}`}${buildQuery(query)}`;

    const finalHeaders: Record<string, string> = {
        accept: 'application/json',
        ...headers,
    };
    if (body !== undefined) finalHeaders['content-type'] = 'application/json';
    if (auth) {
        const { accessToken } = tokenStore.get();
        if (accessToken) finalHeaders.authorization = `Bearer ${accessToken}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let res: Response;
    try {
        res = await fetch(url, {
            method,
            headers: finalHeaders,
            body: body === undefined ? undefined : JSON.stringify(body),
            signal: controller.signal,
        });
    } catch (e: any) {
        clearTimeout(timer);
        throw new ApiError({
            status: 0,
            message: e?.name === 'AbortError' ? 'Request timed out' : 'Network error',
            code: e?.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK',
        });
    }
    clearTimeout(timer);

    const json = await safeJson(res);

    // --- 401 refresh dance (once per request) ---
    if (res.status === 401 && auth && !_isRetry) {
        const nextToken = await refreshAccessToken();
        if (nextToken) {
            return request<T>(path, { ...opts, _isRetry: true });
        }
        await tokenStore.clear();
        fireUnauthorized();
    }

    if (!res.ok || (json && json.success === false)) {
        throw new ApiError({
            status: res.status,
            message: json?.message || `Request failed (${res.status})`,
            code: json?.code,
            details: json?.details,
            requestId: json?.requestId,
        });
    }

    return json as ApiEnvelope<T>;
}

export const http = {
    get: <T = any>(p: string, o?: Omit<RequestOptions, 'method' | 'body'>) =>
        request<T>(p, { ...o, method: 'GET' }),
    post: <T = any>(p: string, body?: unknown, o?: Omit<RequestOptions, 'method' | 'body'>) =>
        request<T>(p, { ...o, method: 'POST', body }),
    patch: <T = any>(p: string, body?: unknown, o?: Omit<RequestOptions, 'method' | 'body'>) =>
        request<T>(p, { ...o, method: 'PATCH', body }),
    put: <T = any>(p: string, body?: unknown, o?: Omit<RequestOptions, 'method' | 'body'>) =>
        request<T>(p, { ...o, method: 'PUT', body }),
    delete: <T = any>(p: string, o?: Omit<RequestOptions, 'method' | 'body'>) =>
        request<T>(p, { ...o, method: 'DELETE' }),
};

export default http;
