import { create } from 'zustand';
import type { LmsAssignment } from '@/types/lms';

interface LmsState {
  assignments: LmsAssignment[];
  lastFetched: number | null;
  setAssignments: (a: LmsAssignment[]) => void;
}

export const useLmsStore = create<LmsState>((set) => ({
  assignments: [],
  lastFetched: null,
  setAssignments: (assignments) => set({ assignments, lastFetched: Date.now() }),
}));
