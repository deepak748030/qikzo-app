import { create } from 'zustand';

type AuthState = {
  phone: string | null;
  name: string;
  onboarded: boolean;
  location: string | null;
  setPhone: (p: string) => void;
  setName: (n: string) => void;
  setOnboarded: (v: boolean) => void;
  setLocation: (l: string | null) => void;
  signOut: () => void;
};

export const useAuth = create<AuthState>((set) => ({
  phone: null,
  name: 'Guest',
  onboarded: false,
  location: null,
  setPhone: (p) => set({ phone: p }),
  setName: (n) => set({ name: n }),
  setOnboarded: (v) => set({ onboarded: v }),
  setLocation: (l) => set({ location: l }),
  signOut: () => set({ phone: null, name: 'Guest' }),
}));
