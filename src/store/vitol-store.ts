import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { zustandStorage } from '@/lib/storage/zustand-storage';
import type { VitolAssignment } from '@/types/vitol';

interface VitolState {
  assignments: VitolAssignment[];
  lastFetched: number | null;
  setAssignments: (a: VitolAssignment[]) => void;
  clear: () => void;
}

export const useVitolStore = create<VitolState>()(
  persist(
    (set) => ({
      assignments: [],
      lastFetched: null,
      setAssignments: (assignments) => set({ assignments, lastFetched: Date.now() }),
      clear: () => set({ assignments: [], lastFetched: null }),
    }),
    {
      name: 'btop-vitol',
      storage: zustandStorage,
    },
  ),
);
