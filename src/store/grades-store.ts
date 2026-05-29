import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { zustandStorage } from '@/lib/storage/zustand-storage';
import type { CourseGrade, SemesterResult } from '@/types/grades';

interface GradesState {
  currentGrades: CourseGrade[];
  semesters: SemesterResult[];
  lastFetchedCurrent: number | null;
  lastFetchedHistory: number | null;
  setCurrentGrades: (grades: CourseGrade[]) => void;
  setSemesters: (semesters: SemesterResult[]) => void;
  clear: () => void;
}

export const useGradesStore = create<GradesState>()(
  persist(
    (set) => ({
      currentGrades: [],
      semesters: [],
      lastFetchedCurrent: null,
      lastFetchedHistory: null,
      setCurrentGrades: (currentGrades) => set({ currentGrades, lastFetchedCurrent: Date.now() }),
      setSemesters: (semesters) => set({ semesters, lastFetchedHistory: Date.now() }),
      clear: () => set({ currentGrades: [], semesters: [], lastFetchedCurrent: null, lastFetchedHistory: null }),
    }),
    {
      name: 'btop-grades',
      storage: zustandStorage,
    },
  ),
);
