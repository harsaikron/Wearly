'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SkinTone = 'fair' | 'light' | 'medium' | 'tan' | 'deep' | 'rich';
export type FashionStyle =
  | 'minimalist' | 'classic' | 'streetwear' | 'bohemian'
  | 'sporty' | 'elegant' | 'edgy' | 'preppy' | 'casual' | 'luxury';
export type Gender = 'male' | 'female' | 'non-binary' | 'prefer-not';

export interface ProfileSizes {
  top?: string;
  bottom?: string;
  shoes?: string;
  dress?: string;
}

interface ProfileStore {
  // ── About ──────────────────────────────────────────────────────
  name: string;
  bio: string;
  gender: Gender;
  avatarDataUrl: string | null;

  // ── Style DNA ──────────────────────────────────────────────────
  skinTone: SkinTone | null;
  fashionStyles: FashionStyle[];
  sizes: ProfileSizes;

  // ── Enhancements ──────────────────────────────────────────────
  autoAnalyzePhotos: boolean;
  autoOOTD: boolean;
  autoGroomingSuggest: boolean;
  autoMakeupSuggest: boolean;
  smartColorMatch: boolean;

  // ── Makeup Preferences ────────────────────────────────────────
  favoriteLipShades: string[];    // hex strings
  favoriteEyeShades: string[];
  favoriteBlushShades: string[];
  skinFinish: 'dewy' | 'matte' | 'satin' | 'natural' | null;

  // ── App Settings ──────────────────────────────────────────────
  currency: string;
  region: string;
  notificationsEnabled: boolean;
  ecoMode: boolean;

  // ── Actions ───────────────────────────────────────────────────
  setName: (v: string) => void;
  setBio: (v: string) => void;
  setGender: (v: Gender) => void;
  setAvatar: (v: string | null) => void;
  setSkinTone: (v: SkinTone | null) => void;
  toggleFashionStyle: (v: FashionStyle) => void;
  setSizes: (v: Partial<ProfileSizes>) => void;
  toggleLipShade: (hex: string) => void;
  toggleEyeShade: (hex: string) => void;
  toggleBlushShade: (hex: string) => void;
  setSkinFinish: (v: ProfileStore['skinFinish']) => void;
  setEnhancement: (
    key: 'autoAnalyzePhotos' | 'autoOOTD' | 'autoGroomingSuggest' | 'autoMakeupSuggest' | 'smartColorMatch',
    v: boolean
  ) => void;
  setCurrency: (v: string) => void;
  setRegion: (v: string) => void;
  setNotifications: (v: boolean) => void;
  setEcoMode: (v: boolean) => void;
}

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set) => ({
      name: '',
      bio: '',
      gender: 'prefer-not',
      avatarDataUrl: null,
      skinTone: null,
      fashionStyles: [],
      sizes: {},
      autoAnalyzePhotos: true,
      autoOOTD: true,
      autoGroomingSuggest: false,
      autoMakeupSuggest: false,
      smartColorMatch: true,
      favoriteLipShades: [],
      favoriteEyeShades: [],
      favoriteBlushShades: [],
      skinFinish: null,
      currency: 'SGD',
      region: 'Singapore',
      notificationsEnabled: false,
      ecoMode: false,

      setName: (v) => set({ name: v }),
      setBio: (v) => set({ bio: v }),
      setGender: (v) => set({ gender: v }),
      setAvatar: (v) => set({ avatarDataUrl: v }),
      setSkinTone: (v) => set({ skinTone: v }),
      toggleFashionStyle: (v) =>
        set((s) => ({
          fashionStyles: s.fashionStyles.includes(v)
            ? s.fashionStyles.filter((x) => x !== v)
            : [...s.fashionStyles, v],
        })),
      setSizes: (v) => set((s) => ({ sizes: { ...s.sizes, ...v } })),
      toggleLipShade: (hex) =>
        set((s) => ({ favoriteLipShades: s.favoriteLipShades.includes(hex) ? s.favoriteLipShades.filter((x) => x !== hex) : [...s.favoriteLipShades, hex] })),
      toggleEyeShade: (hex) =>
        set((s) => ({ favoriteEyeShades: s.favoriteEyeShades.includes(hex) ? s.favoriteEyeShades.filter((x) => x !== hex) : [...s.favoriteEyeShades, hex] })),
      toggleBlushShade: (hex) =>
        set((s) => ({ favoriteBlushShades: s.favoriteBlushShades.includes(hex) ? s.favoriteBlushShades.filter((x) => x !== hex) : [...s.favoriteBlushShades, hex] })),
      setSkinFinish: (v) => set({ skinFinish: v }),
      setEnhancement: (key, v) => set({ [key]: v }),
      setCurrency: (v) => set({ currency: v }),
      setRegion: (v) => set({ region: v }),
      setNotifications: (v) => set({ notificationsEnabled: v }),
      setEcoMode: (v) => set({ ecoMode: v }),
    }),
    { name: 'wearly-profile' }
  )
);
