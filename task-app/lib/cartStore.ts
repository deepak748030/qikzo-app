import { create } from 'zustand';
import { products, Product } from './mockData';

export type CartLine = { product: Product; qty: number };

type CartState = {
  items: Record<string, number>;
  add: (id: string) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  lines: () => CartLine[];
  count: () => number;
  subtotal: () => number;
  savings: () => number;
};

export const useCart = create<CartState>((set, get) => ({
  items: {},
  add: (id) => set((s) => ({ items: { ...s.items, [id]: (s.items[id] || 0) + 1 } })),
  remove: (id) =>
    set((s) => {
      const next = { ...s.items };
      const q = (next[id] || 0) - 1;
      if (q <= 0) delete next[id];
      else next[id] = q;
      return { items: next };
    }),
  setQty: (id, qty) =>
    set((s) => {
      const next = { ...s.items };
      if (qty <= 0) delete next[id];
      else next[id] = qty;
      return { items: next };
    }),
  clear: () => set({ items: {} }),
  lines: () => {
    const { items } = get();
    return Object.entries(items)
      .map(([id, qty]) => {
        const product = products.find((p) => p.id === id);
        return product ? { product, qty } : null;
      })
      .filter(Boolean) as CartLine[];
  },
  count: () => Object.values(get().items).reduce((a, b) => a + b, 0),
  subtotal: () => get().lines().reduce((a, l) => a + l.product.price * l.qty, 0),
  savings: () => get().lines().reduce((a, l) => a + (l.product.mrp - l.product.price) * l.qty, 0),
}));
