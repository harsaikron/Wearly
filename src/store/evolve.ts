'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type FeatureCategory = 'UI / Design' | 'AI Feature' | 'Performance' | 'Bug Fix' | 'New Section' | 'Other';
export type FeatureStatus   = 'drafting' | 'submitted' | 'pr_created' | 'merged' | 'closed';

export interface EvolveFeature {
  id: string;
  title: string;
  description: string;
  category: FeatureCategory;
  status: FeatureStatus;
  prUrl?: string;
  prNumber?: number;
  branchName?: string;
  aiPlan?: string;
  submittedAt: string;
}

interface EvolveStore {
  features: EvolveFeature[];
  addFeature: (f: EvolveFeature) => void;
  updateFeature: (id: string, patch: Partial<EvolveFeature>) => void;
  removeFeature: (id: string) => void;
}

export const useEvolveStore = create<EvolveStore>()(
  persist(
    (set) => ({
      features: [],
      addFeature: (f) => set((s) => ({ features: [f, ...s.features] })),
      updateFeature: (id, patch) =>
        set((s) => ({ features: s.features.map((f) => (f.id === id ? { ...f, ...patch } : f)) })),
      removeFeature: (id) =>
        set((s) => ({ features: s.features.filter((f) => f.id !== id) })),
    }),
    { name: 'wearly-evolve' }
  )
);
