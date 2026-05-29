import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { zustandStorage } from '@/lib/storage/zustand-storage';
import type { LmsAssignment } from '@/types/lms';

interface LmsState {
  assignments: LmsAssignment[];
  lastFetched: number | null;
  setAssignments: (a: LmsAssignment[]) => void;
  clear: () => void;
}

export const useLmsStore = create<LmsState>()(
  persist(
    (set) => ({
      assignments: [],
      lastFetched: null,
      setAssignments: (assignments) => set({ assignments, lastFetched: Date.now() }),
      clear: () => set({ assignments: [], lastFetched: null }),
    }),
    {
      name: 'btop-lms',
      storage: zustandStorage,
    },
  ),
);
