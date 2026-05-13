'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ClothingItem, Outfit } from '@/types';

interface WardrobeStore {
  items: ClothingItem[];
  outfits: Outfit[];
  history: Outfit[];

  addItem: (item: ClothingItem) => void;
  removeItem: (id: string) => void;
  updateItem: (id: string, patch: Partial<ClothingItem>) => void;

  addOutfit: (outfit: Outfit) => void;
  removeOutfit: (id: string) => void;

  addToHistory: (outfit: Outfit) => void;
  removeFromHistory: (id: string) => void;
  incrementWorn: (itemIds: string[]) => void;
  toggleFavorite: (id: string) => void;
  markWornOn: (id: string, date: string) => void; // date = 'YYYY-MM-DD'
}

export const useWardrobeStore = create<WardrobeStore>()(
  persist(
    (set) => ({
      items: [],
      outfits: [],
      history: [],

      addItem: (item) =>
        set((s) => ({ items: [item, ...s.items] })),

      removeItem: (id) =>
        set((s) => ({ items: s.items.filter((i) => i.id !== id) })),

      updateItem: (id, patch) =>
        set((s) => ({
          items: s.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
        })),

      addOutfit: (outfit) =>
        set((s) => ({ outfits: [outfit, ...s.outfits] })),

      removeOutfit: (id) =>
        set((s) => ({ outfits: s.outfits.filter((o) => o.id !== id) })),

      addToHistory: (outfit) =>
        set((s) => ({
          history: [
            { ...outfit, worn_date: new Date().toISOString().split('T')[0] },
            ...s.history,
          ],
        })),

      removeFromHistory: (id) =>
        set((s) => ({ history: s.history.filter((o) => o.id !== id) })),

      incrementWorn: (itemIds) =>
        set((s) => ({
          items: s.items.map((item) =>
            itemIds.includes(item.id)
              ? {
                  ...item,
                  times_worn: item.times_worn + 1,
                  last_worn: new Date().toISOString().split('T')[0],
                }
              : item
          ),
        })),

      toggleFavorite: (id) =>
        set((s) => ({
          items: s.items.map((item) =>
            item.id === id ? { ...item, favorite: !item.favorite } : item
          ),
        })),

      markWornOn: (id, date) =>
        set((s) => ({
          items: s.items.map((item) => {
            if (item.id !== id) return item;
            const prevDates = item.worn_dates ?? [];
            const already = prevDates.includes(date);
            return {
              ...item,
              times_worn: already ? item.times_worn : item.times_worn + 1,
              last_worn: date,
              worn_dates: already ? prevDates : [...prevDates, date].sort(),
            };
          }),
        })),
    }),
    {
      name: 'wearly-wardrobe',
      // Don't persist large base64 images beyond 4MB total
      partialize: (state) => ({
        items: state.items,
        outfits: state.outfits,
        history: state.history,
      }),
    }
  )
);
