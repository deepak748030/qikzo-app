import { create } from 'zustand';

type AuthState = {
  phone: string | null;
  name: string;
  setPhone: (p: string) => void;
  setName: (n: string) => void;
  signOut: () => void;
};

export const useAuth = create<AuthState>((set) => ({
  phone: null,
  name: 'Guest',
  setPhone: (p) => set({ phone: p }),
  setName: (n) => set({ name: n }),
  signOut: () => set({ phone: null, name: 'Guest' }),
}));
