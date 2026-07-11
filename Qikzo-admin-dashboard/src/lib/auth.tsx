import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, tokens, ApiError } from './api';

type User = { id: string; name?: string; phone: string; role: 'customer' | 'rider' | 'admin' };

type Ctx = {
  user: User | null;
  loading: boolean;
  requestOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, code: string) => Promise<User>;
  logout: () => Promise<void>;
};

const AuthCtx = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!tokens.access) { setLoading(false); return; }
      try {
        const r = await api<{ user: User }>('/auth/me');
        if (r.user.role !== 'admin') { tokens.clear(); setUser(null); }
        else setUser(r.user);
      } catch { tokens.clear(); }
      finally { setLoading(false); }
    })();
  }, []);

  const requestOtp = useCallback(async (phone: string) => {
    await api('/auth/request-otp', { method: 'POST', auth: false, body: { phone, purpose: 'login' } });
  }, []);

  const verifyOtp = useCallback(async (phone: string, code: string) => {
    const r = await api<{ user: User; accessToken: string; refreshToken: string }>(
      '/auth/verify-otp', { method: 'POST', auth: false, body: { phone, code, purpose: 'login' } },
    );
    if (r.user.role !== 'admin') {
      throw new ApiError(403, 'This account is not an admin.');
    }
    tokens.set(r.accessToken, r.refreshToken);
    setUser(r.user);
    return r.user;
  }, []);

  const logout = useCallback(async () => {
    try { await api('/auth/logout', { method: 'POST', body: { refreshToken: tokens.refresh } }); } catch {}
    tokens.clear();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, requestOtp, verifyOtp, logout }), [user, loading, requestOtp, verifyOtp, logout]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const c = useContext(AuthCtx);
  if (!c) throw new Error('useAuth outside provider');
  return c;
}
