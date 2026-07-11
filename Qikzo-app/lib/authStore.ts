import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tokenStore } from './api/tokenStore';
import { authApi } from './api/endpoints/auth';

/**
 * Persisted keys (AsyncStorage). Tokens live in tokenStore; here we keep the
 * lightweight profile state the UI depends on.
 */
const K_PHONE = 'qz.profile.phone';
const K_NAME = 'qz.profile.name';
const K_ONBOARDED = 'qz.profile.onboarded';
const K_LOCATION = 'qz.profile.location';
const K_USER_ID = 'qz.profile.userId';

type AuthState = {
  hydrated: boolean;
  userId: string | null;
  phone: string | null;
  name: string;
  onboarded: boolean;
  location: string | null;

  hydrate: () => Promise<void>;
  setPhone: (p: string | null) => void;
  setName: (n: string) => void;
  setOnboarded: (v: boolean) => void;
  setLocation: (l: string | null) => void;
  setSession: (u: { id?: string; phone?: string; name?: string } | null) => void;
  signOut: () => Promise<void>;
};

export const useAuth = create<AuthState>((set, get) => ({
  hydrated: false,
  userId: null,
  phone: null,
  name: 'Guest',
  onboarded: false,
  location: null,

  hydrate: async () => {
    if (get().hydrated) return;
    const [tokens, phone, name, onboarded, location, userId] = await Promise.all([
      tokenStore.hydrate(),
      AsyncStorage.getItem(K_PHONE),
      AsyncStorage.getItem(K_NAME),
      AsyncStorage.getItem(K_ONBOARDED),
      AsyncStorage.getItem(K_LOCATION),
      AsyncStorage.getItem(K_USER_ID),
    ]);
    // If tokens were wiped externally, drop the profile too so gate routes to /login.
    const hasSession = !!tokens.accessToken;
    set({
      hydrated: true,
      userId: hasSession ? userId : null,
      phone: hasSession ? phone : null,
      name: name || 'Guest',
      onboarded: onboarded === '1',
      location,
    });
  },

  setPhone: (p) => {
    set({ phone: p });
    if (p) AsyncStorage.setItem(K_PHONE, p); else AsyncStorage.removeItem(K_PHONE);
  },
  setName: (n) => {
    set({ name: n });
    AsyncStorage.setItem(K_NAME, n);
  },
  setOnboarded: (v) => {
    set({ onboarded: v });
    AsyncStorage.setItem(K_ONBOARDED, v ? '1' : '0');
  },
  setLocation: (l) => {
    set({ location: l });
    if (l) AsyncStorage.setItem(K_LOCATION, l); else AsyncStorage.removeItem(K_LOCATION);
  },
  setSession: (u) => {
    if (!u) {
      set({ userId: null, phone: null });
      AsyncStorage.multiRemove([K_USER_ID, K_PHONE]);
      return;
    }
    const patch: Partial<AuthState> = {};
    if (u.id) { patch.userId = u.id; AsyncStorage.setItem(K_USER_ID, u.id); }
    if (u.phone) { patch.phone = u.phone; AsyncStorage.setItem(K_PHONE, u.phone); }
    if (u.name) { patch.name = u.name; AsyncStorage.setItem(K_NAME, u.name); }
    set(patch as AuthState);
  },

  signOut: async () => {
    try { await authApi.logout(); } catch { /* best effort */ }
    set({ userId: null, phone: null, name: 'Guest' });
    await AsyncStorage.multiRemove([K_USER_ID, K_PHONE]);
  },
}));
