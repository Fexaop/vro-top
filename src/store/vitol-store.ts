import { create } from 'zustand';
import type { VitolAssignment } from '@/types/vitol';

interface VitolState {
  assignments: VitolAssignment[];
  lastFetched: number | null;
  setAssignments: (a: VitolAssignment[]) => void;
}

export const useVitolStore = create<VitolState>((set) => ({
  assignments: [],
  lastFetched: null,
  setAssignments: (assignments) => set({ assignments, lastFetched: Date.now() }),
}));
