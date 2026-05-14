'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { WishlistItem } from '@/types';

interface WishlistStore {
  items: WishlistItem[];
  addItem: (item: WishlistItem) => void;
  removeItem: (id: string) => void;
  hasItem: (id: string) => boolean;
  clear: () => void;
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) =>
        set((s) => {
          if (s.items.find((i) => i.id === item.id)) return s;
          return { items: [item, ...s.items] };
        }),

      removeItem: (id) =>
        set((s) => ({ items: s.items.filter((i) => i.id !== id) })),

      hasItem: (id) => get().items.some((i) => i.id === id),

      clear: () => set({ items: [] }),
    }),
    {
      name: 'wearly-wishlist',
    }
  )
);
