import { create } from 'zustand';
import type { CourseGrade, SemesterResult } from '@/types/grades';

interface GradesState {
  currentGrades: CourseGrade[];
  semesters: SemesterResult[];
  lastFetched: number | null;
  setCurrentGrades: (grades: CourseGrade[]) => void;
  setSemesters: (semesters: SemesterResult[]) => void;
}

export const useGradesStore = create<GradesState>((set) => ({
  currentGrades: [],
  semesters: [],
  lastFetched: null,
  setCurrentGrades: (currentGrades) => set({ currentGrades, lastFetched: Date.now() }),
  setSemesters: (semesters) => set({ semesters }),
}));
