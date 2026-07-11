/**
 * Thin fetch wrapper for the Qikzo REST API. Handles:
 *  - JSON envelope { success, message, ...data }
 *  - Bearer auth from localStorage
 *  - Single-flight refresh on 401
 */
const BASE = (import.meta.env.VITE_API_URL as string) || 'http://localhost:4000/api';

const KEY_ACCESS = 'qz.admin.access';
const KEY_REFRESH = 'qz.admin.refresh';

export const tokens = {
  get access() { return localStorage.getItem(KEY_ACCESS); },
  get refresh() { return localStorage.getItem(KEY_REFRESH); },
  set(access: string, refresh: string) {
    localStorage.setItem(KEY_ACCESS, access);
    localStorage.setItem(KEY_REFRESH, refresh);
  },
  clear() {
    localStorage.removeItem(KEY_ACCESS);
    localStorage.removeItem(KEY_REFRESH);
  },
};

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string, public details?: unknown) {
    super(message);
  }
}

let refreshInflight: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  const refreshToken = tokens.refresh;
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body?.success) return false;
    tokens.set(body.accessToken, body.refreshToken);
    return true;
  } catch { return false; }
}

type Options = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  query?: Record<string, unknown>;
  body?: unknown;
  auth?: boolean;
};

function qs(query?: Record<string, unknown>): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue;
    params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : '';
}

export async function api<T = any>(path: string, opts: Options = {}): Promise<T> {
  const { method = 'GET', query, body, auth = true } = opts;
  const url = `${BASE}${path.startsWith('/') ? path : `/${path}`}${qs(query)}`;
  const headers: Record<string, string> = { accept: 'application/json' };
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (auth && tokens.access) headers.authorization = `Bearer ${tokens.access}`;

  const doFetch = () => fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let res = await doFetch();

  if (res.status === 401 && auth && tokens.refresh) {
    refreshInflight ??= doRefresh().finally(() => { refreshInflight = null; });
    const ok = await refreshInflight;
    if (ok) {
      headers.authorization = `Bearer ${tokens.access}`;
      res = await doFetch();
    }
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) {
    throw new ApiError(res.status, data?.message || 'Request failed', data?.code, data?.details);
  }
  return data as T;
}
