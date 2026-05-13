'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Listing } from '@/types';

const SEED: Listing[] = [
  {
    id: 'demo-1',
    title: 'Slim-Fit Navy Blazer',
    category: 'jacket',
    brand: 'Massimo Dutti',
    size: 'M',
    condition: 'Like New',
    price: 55,
    rent_price_day: 8,
    description: 'Slim-fit navy blazer, worn twice. Perfect for smart-casual events and office days.',
    image_url: '',
    color_hex: '#1B3A6B',
    color_name: 'Navy',
    seller_name: 'Alex T.',
    seller_distance_km: 1.2,
    pickup_location: 'Bugis MRT',
    availability: 'available',
    mode: 'both',
    is_mine: false,
    sustainability_badge: true,
    created_at: '2026-05-01T00:00:00Z',
  },
  {
    id: 'demo-2',
    title: 'White Linen Shirt — Uniqlo',
    category: 'shirt',
    brand: 'Uniqlo',
    size: 'L',
    condition: 'Good',
    price: 18,
    description: 'Breathable linen, great for Singapore heat. Minor fade after wash.',
    image_url: '',
    color_hex: '#F8F8F0',
    color_name: 'Off-White',
    seller_name: 'Ben W.',
    seller_distance_km: 0.8,
    pickup_location: 'Tampines Hub',
    availability: 'available',
    mode: 'sell',
    is_mine: false,
    sustainability_badge: true,
    created_at: '2026-05-03T00:00:00Z',
  },
  {
    id: 'demo-3',
    title: 'Slim Chinos — Olive Green',
    category: 'pants',
    brand: 'H&M',
    size: '32',
    condition: 'Good',
    price: 22,
    rent_price_day: 4,
    description: 'Versatile olive chinos in slim fit. Great for casual weekends.',
    image_url: '',
    color_hex: '#6B7C4E',
    color_name: 'Olive',
    seller_name: 'Sam K.',
    seller_distance_km: 2.1,
    pickup_location: 'Clementi MRT',
    availability: 'available',
    mode: 'both',
    is_mine: false,
    sustainability_badge: true,
    created_at: '2026-05-05T00:00:00Z',
  },
  {
    id: 'demo-4',
    title: 'White Air Force 1 Sneakers',
    category: 'sneakers',
    brand: 'Nike',
    size: 'UK 9',
    condition: 'Like New',
    price: 65,
    description: 'Barely worn. Comes with original box. Clean and fresh.',
    image_url: '',
    color_hex: '#FFFFFF',
    color_name: 'White',
    seller_name: 'Ryan L.',
    seller_distance_km: 3.4,
    pickup_location: 'Orchard MRT',
    availability: 'available',
    mode: 'sell',
    is_mine: false,
    sustainability_badge: true,
    created_at: '2026-05-06T00:00:00Z',
  },
  {
    id: 'demo-5',
    title: 'Black Slim Jeans — Levis 511',
    category: 'jeans',
    brand: "Levi's",
    size: '31x32',
    condition: 'Good',
    price: 30,
    rent_price_day: 5,
    description: 'Classic Levis 511 in black. Worn a handful of times. Very versatile.',
    image_url: '',
    color_hex: '#1A1A2E',
    color_name: 'Jet Black',
    seller_name: 'James P.',
    seller_distance_km: 1.9,
    pickup_location: 'Dhoby Ghaut MRT',
    availability: 'available',
    mode: 'both',
    is_mine: false,
    sustainability_badge: true,
    created_at: '2026-05-07T00:00:00Z',
  },
  {
    id: 'demo-6',
    title: 'Batik Print Shirt — Festive',
    category: 'shirt',
    brand: 'Local Boutique',
    size: 'M',
    condition: 'New',
    price: 40,
    rent_price_day: 10,
    description: 'Beautiful batik print, perfect for Hari Raya and National Day events. Never worn.',
    image_url: '',
    color_hex: '#8B9B6A',
    color_name: 'Sage Green',
    seller_name: 'Farah M.',
    seller_distance_km: 4.2,
    pickup_location: 'Geylang Serai',
    availability: 'available',
    mode: 'both',
    is_mine: false,
    sustainability_badge: false,
    created_at: '2026-05-08T00:00:00Z',
  },
];

interface ListingsStore {
  listings: Listing[];
  seeded: boolean;
  addListing: (l: Listing) => void;
  updateListing: (id: string, patch: Partial<Listing>) => void;
  removeListing: (id: string) => void;
  seed: () => void;
}

export const useListingsStore = create<ListingsStore>()(
  persist(
    (set, get) => ({
      listings: [],
      seeded: false,
      addListing: (l) => set((s) => ({ listings: [l, ...s.listings] })),
      updateListing: (id, patch) =>
        set((s) => ({ listings: s.listings.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),
      removeListing: (id) => set((s) => ({ listings: s.listings.filter((l) => l.id !== id) })),
      seed: () => {
        if (!get().seeded) set({ listings: SEED, seeded: true });
      },
    }),
    { name: 'wearly-listings' }
  )
);
